-- 1. artist_aliases table
CREATE TABLE IF NOT EXISTS public.artist_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- normalize alias storage (lowercase + trim) via trigger
CREATE OR REPLACE FUNCTION public.normalize_alias()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.alias := lower(trim(NEW.alias));
  IF NEW.alias = '' THEN RAISE EXCEPTION 'Alias cannot be empty'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_alias ON public.artist_aliases;
CREATE TRIGGER trg_normalize_alias BEFORE INSERT OR UPDATE ON public.artist_aliases
FOR EACH ROW EXECUTE FUNCTION public.normalize_alias();

CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_aliases_unique ON public.artist_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_artist_aliases_artist ON public.artist_aliases(artist_id);

ALTER TABLE public.artist_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage aliases" ON public.artist_aliases
  FOR ALL USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());

CREATE POLICY "Artists view own aliases" ON public.artist_aliases
  FOR SELECT USING (public.user_is_admin() OR public.has_account_access(artist_id, 'viewer'::account_role));

CREATE POLICY "Artists manage own aliases" ON public.artist_aliases
  FOR INSERT WITH CHECK (public.has_account_access(artist_id, 'manager'::account_role));

CREATE POLICY "Artists delete own aliases" ON public.artist_aliases
  FOR DELETE USING (public.has_account_access(artist_id, 'manager'::account_role));

-- 2. Normalize artists.account_name (lowercase + trim) and enforce uniqueness
CREATE OR REPLACE FUNCTION public.normalize_account_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.account_name IS NOT NULL THEN
    NEW.account_name := lower(trim(NEW.account_name));
    IF NEW.account_name = '' THEN NEW.account_name := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_account_name ON public.artists;
CREATE TRIGGER trg_normalize_account_name BEFORE INSERT OR UPDATE OF account_name ON public.artists
FOR EACH ROW EXECUTE FUNCTION public.normalize_account_name();

-- Backfill normalize existing
UPDATE public.artists SET account_name = lower(trim(account_name)) WHERE account_name IS NOT NULL AND account_name <> lower(trim(account_name));

-- Unique constraint on account_name (excluding nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_account_name_unique ON public.artists(account_name) WHERE account_name IS NOT NULL;

-- 3. Unique aggregation per upload+artist+currency
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_earnings_unique_per_upload
  ON public.monthly_artist_earnings(upload_id, artist_id, currency);

-- 4. Updated process_royalty_upload with new logic:
--    - delete existing monthly earnings for this upload (already done) and revert balances
--    - keep zero-net rows as 'zero_revenue'
--    - alias matching
--    - one match = 100%, multiple matches = split among matched only
CREATE OR REPLACE FUNCTION public.process_royalty_upload(p_upload_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upload public.royalty_uploads;
  v_row RECORD;
  v_artist RECORD;
  v_existing RECORD;
  v_matched_ids uuid[];
  v_per_artist numeric;
  v_total_matched int := 0;
  v_total_unmatched int := 0;
  v_total_zero int := 0;
  v_performer text;
  v_norm text;
BEGIN
  IF NOT public.user_is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_upload FROM public.royalty_uploads WHERE id = p_upload_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Upload not found'; END IF;

  -- Revert previously credited balances from this upload before reprocessing
  FOR v_existing IN SELECT artist_id, total_earnings FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id LOOP
    UPDATE public.artists
    SET available_balance = GREATEST(0, COALESCE(available_balance,0) - v_existing.total_earnings),
        total_earnings = GREATEST(0, COALESCE(total_earnings,0) - v_existing.total_earnings)
    WHERE id = v_existing.artist_id;
  END LOOP;

  DELETE FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id;

  FOR v_row IN SELECT * FROM public.royalty_upload_rows WHERE upload_id = p_upload_id LOOP
    v_matched_ids := '{}';

    -- Match performers via account_name OR alias (case-insensitive)
    IF array_length(v_row.performer_names, 1) > 0 THEN
      FOREACH v_performer IN ARRAY v_row.performer_names LOOP
        v_norm := lower(trim(v_performer));
        IF v_norm = '' THEN CONTINUE; END IF;

        FOR v_artist IN
          SELECT id FROM public.artists
          WHERE account_name IS NOT NULL AND account_name = v_norm
          LIMIT 1
        LOOP
          v_matched_ids := array_append(v_matched_ids, v_artist.id);
        END LOOP;

        FOR v_artist IN
          SELECT artist_id AS id FROM public.artist_aliases WHERE alias = v_norm LIMIT 1
        LOOP
          IF NOT (v_artist.id = ANY(v_matched_ids)) THEN
            v_matched_ids := array_append(v_matched_ids, v_artist.id);
          END IF;
        END LOOP;
      END LOOP;
    END IF;

    -- Fallback substring match against account_name
    IF (array_length(v_matched_ids, 1) IS NULL OR array_length(v_matched_ids, 1) = 0)
       AND v_row.raw_artists IS NOT NULL THEN
      FOR v_artist IN
        SELECT id FROM public.artists
        WHERE account_name IS NOT NULL
          AND position(account_name IN lower(v_row.raw_artists)) > 0
      LOOP
        v_matched_ids := array_append(v_matched_ids, v_artist.id);
      END LOOP;
    END IF;

    -- Zero revenue rows: store but don't credit
    IF v_row.net_amount = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = COALESCE(v_matched_ids, '{}'),
          match_status = 'zero_revenue',
          assigned_amount_per_artist = 0
      WHERE id = v_row.id;
      v_total_zero := v_total_zero + 1;
      CONTINUE;
    END IF;

    -- No match
    IF array_length(v_matched_ids, 1) IS NULL OR array_length(v_matched_ids, 1) = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = '{}', match_status = 'unmatched', assigned_amount_per_artist = 0
      WHERE id = v_row.id;
      v_total_unmatched := v_total_unmatched + 1;
      CONTINUE;
    END IF;

    -- Single match = 100%, multiple matches = split equally among matched
    IF array_length(v_matched_ids, 1) = 1 THEN
      v_per_artist := ROUND(v_row.net_amount, 4);
    ELSE
      v_per_artist := ROUND(v_row.net_amount / array_length(v_matched_ids, 1), 4);
    END IF;

    UPDATE public.royalty_upload_rows
    SET matched_artist_ids = v_matched_ids,
        match_status = 'matched',
        assigned_amount_per_artist = v_per_artist
    WHERE id = v_row.id;

    v_total_matched := v_total_matched + 1;

    FOR v_artist IN SELECT unnest(v_matched_ids) AS id LOOP
      INSERT INTO public.monthly_artist_earnings
        (artist_id, account_name, period_year, period_month, total_streams, total_earnings, currency, upload_id)
      VALUES (
        v_artist.id,
        (SELECT account_name FROM public.artists WHERE id = v_artist.id),
        v_upload.period_year,
        v_upload.period_month,
        v_row.quantity,
        v_per_artist,
        v_row.currency,
        p_upload_id
      )
      ON CONFLICT (upload_id, artist_id, currency)
      DO UPDATE SET
        total_streams = public.monthly_artist_earnings.total_streams + EXCLUDED.total_streams,
        total_earnings = public.monthly_artist_earnings.total_earnings + EXCLUDED.total_earnings,
        updated_at = now();

      UPDATE public.artists
      SET available_balance = COALESCE(available_balance, 0) + v_per_artist,
          total_earnings = COALESCE(total_earnings, 0) + v_per_artist
      WHERE id = v_artist.id;
    END LOOP;
  END LOOP;

  UPDATE public.royalty_uploads
  SET matched_rows = v_total_matched,
      unmatched_rows = v_total_unmatched,
      status = 'completed',
      updated_at = now()
  WHERE id = p_upload_id;

  RETURN jsonb_build_object('matched', v_total_matched, 'unmatched', v_total_unmatched, 'zero_revenue', v_total_zero);
END;
$$;