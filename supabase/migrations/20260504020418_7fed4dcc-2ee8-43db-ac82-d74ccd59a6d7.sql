
-- ============ NEW TABLES ============
CREATE TYPE split_status AS ENUM ('draft','active','locked');
CREATE TYPE split_recipient_status AS ENUM ('pending','accepted','declined');

CREATE TABLE public.splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL,
  release_id uuid,
  owner_artist_id uuid NOT NULL,
  status split_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(track_id)
);

CREATE TABLE public.split_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id uuid NOT NULL REFERENCES public.splits(id) ON DELETE CASCADE,
  artist_id uuid,
  email text,
  percentage numeric(6,3) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  role text NOT NULL DEFAULT 'collaborator',
  status split_recipient_status NOT NULL DEFAULT 'pending',
  invitation_token uuid DEFAULT gen_random_uuid(),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CHECK (artist_id IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_split_recipients_split ON public.split_recipients(split_id);
CREATE INDEX idx_split_recipients_artist ON public.split_recipients(artist_id);
CREATE INDEX idx_split_recipients_email ON public.split_recipients(lower(email));
CREATE INDEX idx_split_recipients_token ON public.split_recipients(invitation_token);
CREATE INDEX idx_splits_track ON public.splits(track_id);
CREATE INDEX idx_splits_owner ON public.splits(owner_artist_id);

ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_recipients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_split_recipients_total()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_total numeric;
BEGIN
  SELECT COALESCE(SUM(percentage),0) INTO v_total
  FROM public.split_recipients
  WHERE split_id = NEW.split_id
    AND id != COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
    AND status != 'declined';
  v_total := v_total + NEW.percentage;
  IF v_total > 100.001 THEN
    RAISE EXCEPTION 'Split recipients total would exceed 100 percent';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_split_recipients_total
BEFORE INSERT OR UPDATE ON public.split_recipients
FOR EACH ROW EXECUTE FUNCTION public.validate_split_recipients_total();

CREATE OR REPLACE FUNCTION public.lock_split_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'locked' AND NEW.status != 'locked' THEN
    RAISE EXCEPTION 'Cannot edit a locked split';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_lock_split BEFORE UPDATE ON public.splits
FOR EACH ROW EXECUTE FUNCTION public.lock_split_guard();

CREATE POLICY "Admins manage all splits" ON public.splits
  FOR ALL USING (user_is_admin()) WITH CHECK (user_is_admin());
CREATE POLICY "Owners manage own splits" ON public.splits
  FOR ALL USING (has_account_access(owner_artist_id, 'manager'::account_role))
  WITH CHECK (has_account_access(owner_artist_id, 'manager'::account_role));
CREATE POLICY "Recipients view splits they belong to" ON public.splits
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.split_recipients sr
    WHERE sr.split_id = splits.id AND sr.artist_id = auth.uid()));

CREATE POLICY "Admins manage all recipients" ON public.split_recipients
  FOR ALL USING (user_is_admin()) WITH CHECK (user_is_admin());
CREATE POLICY "Owners manage recipients of own splits" ON public.split_recipients
  FOR ALL USING (EXISTS (SELECT 1 FROM public.splits s
    WHERE s.id = split_recipients.split_id
      AND has_account_access(s.owner_artist_id, 'manager'::account_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.splits s
    WHERE s.id = split_recipients.split_id
      AND has_account_access(s.owner_artist_id, 'manager'::account_role)));
CREATE POLICY "Recipients view own row" ON public.split_recipients
  FOR SELECT USING (artist_id = auth.uid());
CREATE POLICY "Recipients update own row to accept/decline" ON public.split_recipients
  FOR UPDATE USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());

-- ============ DATA MIGRATION ============
DO $$
DECLARE r RECORD; v_split_id uuid; v_owner uuid; v_release_id uuid;
BEGIN
  FOR r IN
    SELECT track_id,
           (array_agg(release_id) FILTER (WHERE release_id IS NOT NULL))[1] AS release_id
    FROM public.royalty_splits
    WHERE status IN ('approved','pending')
    GROUP BY track_id
  LOOP
    SELECT primary_artist_id INTO v_owner FROM public.tracks WHERE id = r.track_id;
    IF v_owner IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.splits (track_id, release_id, owner_artist_id, status)
    VALUES (r.track_id, r.release_id, v_owner, 'active')
    ON CONFLICT (track_id) DO NOTHING
    RETURNING id INTO v_split_id;
    IF v_split_id IS NULL THEN
      SELECT id INTO v_split_id FROM public.splits WHERE track_id = r.track_id;
    END IF;

    INSERT INTO public.split_recipients (split_id, artist_id, percentage, role, status)
    SELECT v_split_id, rs.artist_id, rs.percentage,
           CASE WHEN rs.artist_id = v_owner THEN 'owner' ELSE 'collaborator' END,
           CASE WHEN rs.status = 'approved' THEN 'accepted'::split_recipient_status
                ELSE 'pending'::split_recipient_status END
    FROM public.royalty_splits rs
    WHERE rs.track_id = r.track_id AND rs.status IN ('approved','pending');
  END LOOP;
END $$;

-- ============ REWRITE process_income ============
CREATE OR REPLACE FUNCTION public.process_income(
  p_track_id uuid, p_platform_id uuid, p_amount numeric,
  p_description text DEFAULT NULL, p_reference text DEFAULT NULL,
  p_date date DEFAULT CURRENT_DATE, p_created_by uuid DEFAULT auth.uid()
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_income_id uuid; v_track_owner uuid; v_split_id uuid;
  v_total_pct numeric; v_amount numeric; v_share numeric;
  v_recipient RECORD; v_balance numeric;
BEGIN
  IF NOT user_is_admin(p_created_by) THEN RAISE EXCEPTION 'Only admins can add income'; END IF;
  v_amount := ABS(p_amount);
  IF v_amount = 0 THEN RAISE EXCEPTION 'Amount must be non-zero'; END IF;

  SELECT primary_artist_id INTO v_track_owner FROM tracks WHERE id = p_track_id;
  IF v_track_owner IS NULL THEN RAISE EXCEPTION 'Track not found'; END IF;
  IF p_reference IS NOT NULL AND EXISTS (SELECT 1 FROM incomes WHERE reference = p_reference) THEN
    RAISE EXCEPTION 'Duplicate reference';
  END IF;

  INSERT INTO incomes (track_id, platform_id, amount, description, reference, date, created_by, workflow_status)
  VALUES (p_track_id, p_platform_id, v_amount, p_description, p_reference, p_date, p_created_by, 'draft')
  RETURNING id INTO v_income_id;

  SELECT s.id, COALESCE(SUM(sr.percentage),0) INTO v_split_id, v_total_pct
  FROM splits s
  LEFT JOIN split_recipients sr ON sr.split_id = s.id AND sr.status = 'accepted'
  WHERE s.track_id = p_track_id AND s.status IN ('active','locked')
  GROUP BY s.id LIMIT 1;

  IF v_split_id IS NOT NULL AND v_total_pct = 100 THEN
    UPDATE splits SET status = 'locked' WHERE id = v_split_id AND status = 'active';
    FOR v_recipient IN
      SELECT artist_id, percentage FROM split_recipients
      WHERE split_id = v_split_id AND status = 'accepted' AND artist_id IS NOT NULL
    LOOP
      v_share := ROUND(v_amount * v_recipient.percentage / 100, 2);
      UPDATE artists SET
        available_balance = COALESCE(available_balance,0) + v_share,
        total_earnings = COALESCE(total_earnings,0) + v_share
      WHERE id = v_recipient.artist_id;
      SELECT COALESCE(available_balance,0) INTO v_balance FROM artists WHERE id = v_recipient.artist_id;
      INSERT INTO income_transactions (artist_id, track_id, platform_id, income_id, type, amount, balance_after, description)
      VALUES (v_recipient.artist_id, p_track_id, p_platform_id, v_income_id,
              CASE WHEN v_recipient.artist_id = v_track_owner THEN 'income' ELSE 'royalty_share_in' END,
              v_share, v_balance,
              concat(COALESCE(p_description,'Income'),' (',v_recipient.percentage,'%)'));
    END LOOP;
  ELSE
    UPDATE artists SET
      available_balance = COALESCE(available_balance,0) + v_amount,
      total_earnings = COALESCE(total_earnings,0) + v_amount
    WHERE id = v_track_owner;
    SELECT COALESCE(available_balance,0) INTO v_balance FROM artists WHERE id = v_track_owner;
    INSERT INTO income_transactions (artist_id, track_id, platform_id, income_id, type, amount, balance_after, description)
    VALUES (v_track_owner, p_track_id, p_platform_id, v_income_id, 'income', v_amount, v_balance,
            COALESCE(p_description,'Income from track'));
  END IF;

  UPDATE incomes SET workflow_status = 'processed' WHERE id = v_income_id;
  RETURN v_income_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.process_income(uuid,uuid,numeric,text,text,date,uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_income(uuid,uuid,numeric,text,text,date,uuid) TO authenticated;

-- ============ FIX process_royalty_upload (ABS values, honour pre-assigned) ============
CREATE OR REPLACE FUNCTION public.process_royalty_upload(p_upload_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_upload public.royalty_uploads;
  v_row RECORD; v_artist RECORD; v_existing RECORD;
  v_matched_ids uuid[]; v_per_artist numeric;
  v_total_matched int := 0; v_total_unmatched int := 0; v_total_zero int := 0;
  v_performer text; v_norm text; v_safe_net numeric;
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_upload FROM public.royalty_uploads WHERE id = p_upload_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Upload not found'; END IF;

  FOR v_existing IN SELECT artist_id, ABS(total_earnings) AS amt FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id LOOP
    UPDATE public.artists
    SET available_balance = GREATEST(0, COALESCE(available_balance,0) - v_existing.amt),
        total_earnings = GREATEST(0, COALESCE(total_earnings,0) - v_existing.amt)
    WHERE id = v_existing.artist_id;
  END LOOP;
  DELETE FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id;

  FOR v_row IN SELECT * FROM public.royalty_upload_rows WHERE upload_id = p_upload_id LOOP
    v_matched_ids := '{}';
    v_safe_net := ABS(COALESCE(v_row.net_amount, 0));

    -- Honour admin pre-assignment first
    IF array_length(v_row.matched_artist_ids,1) > 0 AND v_row.match_status = 'matched' THEN
      v_matched_ids := v_row.matched_artist_ids;
    ELSE
      IF array_length(v_row.performer_names, 1) > 0 THEN
        FOREACH v_performer IN ARRAY v_row.performer_names LOOP
          v_norm := lower(trim(v_performer));
          IF v_norm = '' THEN CONTINUE; END IF;
          FOR v_artist IN SELECT id FROM public.artists WHERE account_name = v_norm LIMIT 1 LOOP
            v_matched_ids := array_append(v_matched_ids, v_artist.id);
          END LOOP;
          FOR v_artist IN SELECT artist_id AS id FROM public.artist_aliases WHERE alias = v_norm LIMIT 1 LOOP
            IF NOT (v_artist.id = ANY(v_matched_ids)) THEN
              v_matched_ids := array_append(v_matched_ids, v_artist.id);
            END IF;
          END LOOP;
        END LOOP;
      END IF;
      IF (array_length(v_matched_ids,1) IS NULL OR array_length(v_matched_ids,1) = 0)
         AND v_row.raw_artists IS NOT NULL THEN
        FOR v_artist IN SELECT id FROM public.artists
          WHERE account_name IS NOT NULL AND position(account_name IN lower(v_row.raw_artists)) > 0
        LOOP v_matched_ids := array_append(v_matched_ids, v_artist.id); END LOOP;
      END IF;
    END IF;

    IF v_safe_net = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = COALESCE(v_matched_ids,'{}'),
          match_status = 'zero_revenue', assigned_amount_per_artist = 0
      WHERE id = v_row.id;
      v_total_zero := v_total_zero + 1; CONTINUE;
    END IF;
    IF array_length(v_matched_ids,1) IS NULL OR array_length(v_matched_ids,1) = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = '{}', match_status = 'unmatched', assigned_amount_per_artist = 0
      WHERE id = v_row.id;
      v_total_unmatched := v_total_unmatched + 1; CONTINUE;
    END IF;

    v_per_artist := ROUND(v_safe_net / array_length(v_matched_ids,1), 4);

    UPDATE public.royalty_upload_rows
    SET matched_artist_ids = v_matched_ids, match_status = 'matched',
        assigned_amount_per_artist = v_per_artist
    WHERE id = v_row.id;
    v_total_matched := v_total_matched + 1;

    FOR v_artist IN SELECT unnest(v_matched_ids) AS id LOOP
      INSERT INTO public.monthly_artist_earnings
        (artist_id, account_name, period_year, period_month, total_streams, total_earnings, currency, upload_id)
      VALUES (v_artist.id,
        (SELECT account_name FROM public.artists WHERE id = v_artist.id),
        v_upload.period_year, v_upload.period_month,
        v_row.quantity, v_per_artist, v_row.currency, p_upload_id)
      ON CONFLICT (upload_id, artist_id, currency) DO UPDATE SET
        total_streams = public.monthly_artist_earnings.total_streams + EXCLUDED.total_streams,
        total_earnings = public.monthly_artist_earnings.total_earnings + EXCLUDED.total_earnings,
        updated_at = now();
      UPDATE public.artists
      SET available_balance = COALESCE(available_balance,0) + v_per_artist,
          total_earnings = COALESCE(total_earnings,0) + v_per_artist
      WHERE id = v_artist.id;
    END LOOP;
  END LOOP;

  UPDATE public.royalty_uploads
  SET matched_rows = v_total_matched, unmatched_rows = v_total_unmatched,
      status = 'completed', updated_at = now()
  WHERE id = p_upload_id;

  RETURN jsonb_build_object('matched',v_total_matched,'unmatched',v_total_unmatched,'zero_revenue',v_total_zero);
END $$;
REVOKE EXECUTE ON FUNCTION public.process_royalty_upload(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_royalty_upload(uuid) TO authenticated;

-- ============ Auto-link external recipients on artist creation ============
CREATE OR REPLACE FUNCTION public.link_split_recipients_for_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.split_recipients
  SET artist_id = NEW.id
  WHERE artist_id IS NULL AND email IS NOT NULL AND lower(email) = lower(NEW.email);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_link_split_recipients ON public.artists;
CREATE TRIGGER trg_link_split_recipients
AFTER INSERT ON public.artists
FOR EACH ROW WHEN (NEW.email IS NOT NULL)
EXECUTE FUNCTION public.link_split_recipients_for_email();
