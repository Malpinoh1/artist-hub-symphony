
-- 1. Add account_name to artists
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS account_name text;
UPDATE public.artists SET account_name = name WHERE account_name IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS artists_account_name_lower_idx ON public.artists (lower(account_name)) WHERE account_name IS NOT NULL;

-- 2. royalty_uploads
CREATE TABLE IF NOT EXISTS public.royalty_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  period_label text NOT NULL,
  period_year int NOT NULL,
  period_month int NOT NULL,
  uploaded_by uuid NOT NULL,
  total_rows int NOT NULL DEFAULT 0,
  matched_rows int NOT NULL DEFAULT 0,
  unmatched_rows int NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.royalty_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage uploads" ON public.royalty_uploads FOR ALL USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());

-- 3. royalty_upload_rows
CREATE TABLE IF NOT EXISTS public.royalty_upload_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.royalty_uploads(id) ON DELETE CASCADE,
  track_title text,
  raw_artists text,
  performer_names text[] NOT NULL DEFAULT '{}',
  track_external_id text,
  quantity int NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  sales_type text,
  matched_artist_ids uuid[] NOT NULL DEFAULT '{}',
  match_status text NOT NULL DEFAULT 'unmatched',
  assigned_amount_per_artist numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS royalty_upload_rows_upload_idx ON public.royalty_upload_rows(upload_id);
CREATE INDEX IF NOT EXISTS royalty_upload_rows_match_status_idx ON public.royalty_upload_rows(match_status);
ALTER TABLE public.royalty_upload_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage upload rows" ON public.royalty_upload_rows FOR ALL USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());
CREATE POLICY "Artists view own matched rows" ON public.royalty_upload_rows FOR SELECT USING (auth.uid() = ANY(matched_artist_ids));

-- 4. monthly_artist_earnings
CREATE TABLE IF NOT EXISTS public.monthly_artist_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  account_name text,
  period_year int NOT NULL,
  period_month int NOT NULL,
  total_streams int NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  upload_id uuid REFERENCES public.royalty_uploads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, period_year, period_month, currency)
);
CREATE INDEX IF NOT EXISTS mae_artist_idx ON public.monthly_artist_earnings(artist_id);
ALTER TABLE public.monthly_artist_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage monthly earnings" ON public.monthly_artist_earnings FOR ALL USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());
CREATE POLICY "Artists view own monthly earnings" ON public.monthly_artist_earnings FOR SELECT USING (
  public.user_is_admin() OR public.has_account_access(artist_id, 'viewer'::account_role)
);

-- 5. Process upload RPC
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
  v_matched_ids uuid[];
  v_per_artist numeric;
  v_total_matched int := 0;
  v_total_unmatched int := 0;
  v_performer text;
BEGIN
  IF NOT public.user_is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_upload FROM public.royalty_uploads WHERE id = p_upload_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Upload not found'; END IF;

  -- Wipe previous aggregates for this upload to allow reprocessing
  DELETE FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id;

  FOR v_row IN SELECT * FROM public.royalty_upload_rows WHERE upload_id = p_upload_id LOOP
    v_matched_ids := '{}';

    -- Try matching each performer to an artist by account_name (case-insensitive)
    IF array_length(v_row.performer_names, 1) > 0 THEN
      FOREACH v_performer IN ARRAY v_row.performer_names LOOP
        FOR v_artist IN
          SELECT id FROM public.artists
          WHERE account_name IS NOT NULL
            AND lower(account_name) = lower(trim(v_performer))
          LIMIT 1
        LOOP
          v_matched_ids := array_append(v_matched_ids, v_artist.id);
        END LOOP;
      END LOOP;
    END IF;

    -- Fallback substring match
    IF array_length(v_matched_ids, 1) IS NULL AND v_row.raw_artists IS NOT NULL THEN
      FOR v_artist IN
        SELECT id FROM public.artists
        WHERE account_name IS NOT NULL
          AND position(lower(account_name) IN lower(v_row.raw_artists)) > 0
      LOOP
        v_matched_ids := array_append(v_matched_ids, v_artist.id);
      END LOOP;
    END IF;

    IF array_length(v_matched_ids, 1) IS NULL OR array_length(v_matched_ids, 1) = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = '{}', match_status = 'unmatched', assigned_amount_per_artist = 0
      WHERE id = v_row.id;
      v_total_unmatched := v_total_unmatched + 1;
      CONTINUE;
    END IF;

    v_per_artist := ROUND(v_row.net_amount / array_length(v_matched_ids, 1), 4);

    UPDATE public.royalty_upload_rows
    SET matched_artist_ids = v_matched_ids,
        match_status = 'matched',
        assigned_amount_per_artist = v_per_artist
    WHERE id = v_row.id;

    v_total_matched := v_total_matched + 1;

    -- Aggregate
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
      ON CONFLICT (artist_id, period_year, period_month, currency)
      DO UPDATE SET
        total_streams = public.monthly_artist_earnings.total_streams + EXCLUDED.total_streams,
        total_earnings = public.monthly_artist_earnings.total_earnings + EXCLUDED.total_earnings,
        updated_at = now();

      -- Credit artist available balance
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

  RETURN jsonb_build_object('matched', v_total_matched, 'unmatched', v_total_unmatched);
END;
$$;

-- updated_at triggers
CREATE TRIGGER royalty_uploads_updated BEFORE UPDATE ON public.royalty_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mae_updated BEFORE UPDATE ON public.monthly_artist_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
