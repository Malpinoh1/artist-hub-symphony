
-- 1) Distributors catalog (backend/admin only)
CREATE TABLE IF NOT EXISTS public.distributors (
  code text PRIMARY KEY,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.distributors TO authenticated;
GRANT ALL ON public.distributors TO service_role;

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage distributors" ON public.distributors;
CREATE POLICY "Admins manage distributors" ON public.distributors
  FOR ALL TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- Read access for authenticated users is intentionally NOT granted via policy
-- (distributor identity is admin-only info). The GRANT above only lets PostgREST
-- route requests; RLS blocks non-admins.
DROP POLICY IF EXISTS "Admins read distributors" ON public.distributors;
CREATE POLICY "Admins read distributors" ON public.distributors
  FOR SELECT TO authenticated
  USING (public.user_is_admin());

INSERT INTO public.distributors (code, name) VALUES
  ('onerpm', 'ONErpm'),
  ('soundon', 'SoundOn')
ON CONFLICT (code) DO NOTHING;

-- 2) Add distributor_code + new normalized fields
ALTER TABLE public.royalty_uploads
  ADD COLUMN IF NOT EXISTS distributor_code text REFERENCES public.distributors(code);

ALTER TABLE public.royalty_upload_rows
  ADD COLUMN IF NOT EXISTS distributor_code text REFERENCES public.distributors(code),
  ADD COLUMN IF NOT EXISTS isrc text,
  ADD COLUMN IF NOT EXISTS upc text,
  ADD COLUMN IF NOT EXISTS album_title text,
  ADD COLUMN IF NOT EXISTS royalty_type text,
  ADD COLUMN IF NOT EXISTS gross_revenue numeric,
  ADD COLUMN IF NOT EXISTS artist_share numeric,
  ADD COLUMN IF NOT EXISTS final_royalty numeric;

ALTER TABLE public.monthly_stream_stats
  ADD COLUMN IF NOT EXISTS distributor_code text REFERENCES public.distributors(code);

-- 3) Backfill existing data → onerpm
UPDATE public.royalty_uploads SET distributor_code = 'onerpm' WHERE distributor_code IS NULL;
UPDATE public.royalty_upload_rows SET distributor_code = 'onerpm' WHERE distributor_code IS NULL;
UPDATE public.monthly_stream_stats SET distributor_code = 'onerpm' WHERE distributor_code IS NULL;

-- 4) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_royalty_upload_rows_isrc ON public.royalty_upload_rows (isrc) WHERE isrc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_royalty_upload_rows_upc  ON public.royalty_upload_rows (upc)  WHERE upc  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_royalty_uploads_period_distributor ON public.royalty_uploads (period_year, period_month, distributor_code);
CREATE INDEX IF NOT EXISTS idx_release_tracks_isrc ON public.release_tracks (isrc) WHERE isrc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_releases_isrc ON public.releases (isrc) WHERE isrc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_releases_upc  ON public.releases (upc)  WHERE upc  IS NOT NULL;

-- 5) Update check_month_already_imported to be distributor-aware but backward compatible.
-- Existing signature preserved; add a new function that filters by distributor.
CREATE OR REPLACE FUNCTION public.check_month_imported_for_distributor(
  p_year integer, p_month integer, p_distributor text
) RETURNS TABLE(id uuid, file_name text, total_rows integer, total_amount numeric, distributor_code text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, file_name, total_rows, total_amount, distributor_code, created_at
  FROM public.royalty_uploads
  WHERE period_year = p_year
    AND period_month = p_month
    AND distributor_code = p_distributor
  ORDER BY created_at DESC;
$$;

-- 6) Delete month uploads for a single distributor only
CREATE OR REPLACE FUNCTION public.delete_month_uploads_for_distributor(
  p_year integer, p_month integer, p_distributor text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  WITH d AS (
    DELETE FROM public.royalty_uploads
    WHERE period_year = p_year AND period_month = p_month AND distributor_code = p_distributor
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM d;
  RETURN v_count;
END $$;

-- 7) Upgrade process_royalty_upload with ISRC/UPC matching + distributor tagging
CREATE OR REPLACE FUNCTION public.process_royalty_upload(p_upload_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_upload public.royalty_uploads;
  v_row RECORD; v_artist RECORD; v_existing RECORD;
  v_matched_ids uuid[]; v_per_artist numeric;
  v_total_matched int := 0; v_total_unmatched int := 0; v_total_zero int := 0;
  v_performer text; v_norm text; v_safe_net numeric;
  v_track_id uuid; v_release_id uuid; v_release_artist uuid;
  v_per_downloads bigint;
  v_distributor text;
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_upload FROM public.royalty_uploads WHERE id = p_upload_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Upload not found'; END IF;
  v_distributor := COALESCE(v_upload.distributor_code, 'onerpm');

  -- Reverse prior earnings
  FOR v_existing IN SELECT artist_id, ABS(total_earnings) AS amt FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id LOOP
    UPDATE public.artists
    SET available_balance = GREATEST(0, COALESCE(available_balance,0) - v_existing.amt),
        total_earnings = GREATEST(0, COALESCE(total_earnings,0) - v_existing.amt)
    WHERE id = v_existing.artist_id;
  END LOOP;
  DELETE FROM public.monthly_artist_earnings WHERE upload_id = p_upload_id;
  DELETE FROM public.monthly_stream_stats WHERE upload_id = p_upload_id;

  FOR v_row IN SELECT * FROM public.royalty_upload_rows WHERE upload_id = p_upload_id LOOP
    v_matched_ids := '{}';
    v_track_id := NULL; v_release_id := NULL; v_release_artist := NULL;
    v_safe_net := ABS(COALESCE(v_row.net_amount, 0));

    -- Priority 1: ISRC → release_tracks.isrc → release.artist_id, or releases.isrc directly
    IF v_row.isrc IS NOT NULL AND length(trim(v_row.isrc)) > 0 THEN
      SELECT rt.id, rt.release_id, r.artist_id
        INTO v_track_id, v_release_id, v_release_artist
      FROM public.release_tracks rt
      JOIN public.releases r ON r.id = rt.release_id
      WHERE upper(rt.isrc) = upper(trim(v_row.isrc))
      LIMIT 1;

      IF v_release_artist IS NULL THEN
        SELECT id, artist_id INTO v_release_id, v_release_artist
        FROM public.releases WHERE upper(isrc) = upper(trim(v_row.isrc)) LIMIT 1;
      END IF;

      IF v_release_artist IS NOT NULL THEN
        v_matched_ids := ARRAY[v_release_artist];
      END IF;
    END IF;

    -- Priority 2: UPC + Track Title
    IF array_length(v_matched_ids,1) IS NULL AND v_row.upc IS NOT NULL AND length(trim(v_row.upc)) > 0 THEN
      SELECT r.id, r.artist_id INTO v_release_id, v_release_artist
      FROM public.releases r
      WHERE r.upc = trim(v_row.upc)
      LIMIT 1;
      IF v_release_artist IS NOT NULL THEN
        v_matched_ids := ARRAY[v_release_artist];
        IF v_row.track_title IS NOT NULL THEN
          SELECT rt.id INTO v_track_id
          FROM public.release_tracks rt
          WHERE rt.release_id = v_release_id
            AND lower(trim(rt.title)) = lower(trim(v_row.track_title))
          LIMIT 1;
        END IF;
      END IF;
    END IF;

    -- Priority 3: existing pre-matched or performer name matching
    IF array_length(v_matched_ids,1) IS NULL THEN
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
    END IF;

    IF v_safe_net = 0 AND COALESCE(v_row.quantity,0) = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = COALESCE(v_matched_ids,'{}'),
          match_status = 'zero_revenue', assigned_amount_per_artist = 0,
          distributor_code = v_distributor
      WHERE id = v_row.id;
      v_total_zero := v_total_zero + 1; CONTINUE;
    END IF;
    IF array_length(v_matched_ids,1) IS NULL OR array_length(v_matched_ids,1) = 0 THEN
      UPDATE public.royalty_upload_rows
      SET matched_artist_ids = '{}', match_status = 'unmatched', assigned_amount_per_artist = 0,
          distributor_code = v_distributor
      WHERE id = v_row.id;
      v_total_unmatched := v_total_unmatched + 1; CONTINUE;
    END IF;

    v_per_artist := ROUND(v_safe_net / array_length(v_matched_ids,1), 4);
    v_per_downloads := FLOOR(COALESCE(v_row.downloads,0)::numeric / array_length(v_matched_ids,1));

    UPDATE public.royalty_upload_rows
    SET matched_artist_ids = v_matched_ids, match_status = 'matched',
        assigned_amount_per_artist = v_per_artist,
        distributor_code = v_distributor
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

      -- Fallback title-only match when ISRC/UPC didn't identify a specific track
      IF v_track_id IS NULL AND v_row.track_title IS NOT NULL AND length(trim(v_row.track_title)) > 0 THEN
        SELECT t.id, t.release_id INTO v_track_id, v_release_id
        FROM public.tracks t
        WHERE t.primary_artist_id = v_artist.id
          AND lower(trim(t.title)) = lower(trim(v_row.track_title))
        LIMIT 1;
      END IF;

      INSERT INTO public.monthly_stream_stats
        (artist_id, release_id, track_id, upload_id, period_year, period_month,
         track_title, dsp_name, country, streams, downloads, quantity, revenue, currency, distributor_code)
      VALUES
        (v_artist.id, v_release_id, v_track_id, p_upload_id,
         v_upload.period_year, v_upload.period_month,
         v_row.track_title, v_row.dsp_name, v_row.country,
         COALESCE(v_row.quantity,0), v_per_downloads, COALESCE(v_row.quantity,0),
         v_per_artist, v_row.currency, v_distributor);
    END LOOP;
  END LOOP;

  UPDATE public.royalty_uploads
  SET matched_rows = v_total_matched, unmatched_rows = v_total_unmatched,
      status = 'completed', updated_at = now()
  WHERE id = p_upload_id;

  RETURN jsonb_build_object('matched',v_total_matched,'unmatched',v_total_unmatched,'zero_revenue',v_total_zero,'distributor',v_distributor);
END $function$;
