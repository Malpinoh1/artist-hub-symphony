
-- 1. Extend royalty_upload_rows with new optional columns
ALTER TABLE public.royalty_upload_rows
  ADD COLUMN IF NOT EXISTS dsp_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS downloads bigint NOT NULL DEFAULT 0;

-- 2. monthly_stream_stats table
CREATE TABLE IF NOT EXISTS public.monthly_stream_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
  track_id uuid REFERENCES public.tracks(id) ON DELETE SET NULL,
  upload_id uuid NOT NULL REFERENCES public.royalty_uploads(id) ON DELETE CASCADE,
  period_year int NOT NULL,
  period_month int NOT NULL,
  track_title text,
  dsp_name text,
  country text,
  streams bigint NOT NULL DEFAULT 0,
  downloads bigint NOT NULL DEFAULT 0,
  quantity bigint NOT NULL DEFAULT 0,
  revenue numeric(14,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mss_artist_period ON public.monthly_stream_stats(artist_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_mss_track ON public.monthly_stream_stats(track_id);
CREATE INDEX IF NOT EXISTS idx_mss_release ON public.monthly_stream_stats(release_id);
CREATE INDEX IF NOT EXISTS idx_mss_upload ON public.monthly_stream_stats(upload_id);
CREATE INDEX IF NOT EXISTS idx_mss_dsp ON public.monthly_stream_stats(dsp_name);

GRANT SELECT ON public.monthly_stream_stats TO authenticated;
GRANT ALL ON public.monthly_stream_stats TO service_role;

ALTER TABLE public.monthly_stream_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view their own stream stats"
  ON public.monthly_stream_stats FOR SELECT TO authenticated
  USING (
    artist_id = auth.uid()
    OR public.user_has_any_admin_role(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.account_access aa
      WHERE aa.account_owner_id = monthly_stream_stats.artist_id
        AND aa.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage stream stats"
  ON public.monthly_stream_stats FOR ALL TO authenticated
  USING (public.user_has_any_admin_role(auth.uid()))
  WITH CHECK (public.user_has_any_admin_role(auth.uid()));

-- 3. Duplicate detection RPC
CREATE OR REPLACE FUNCTION public.check_month_already_imported(p_year int, p_month int)
RETURNS TABLE(id uuid, file_name text, total_rows int, total_amount numeric, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, file_name, total_rows, total_amount, created_at
  FROM public.royalty_uploads
  WHERE period_year = p_year AND period_month = p_month
  ORDER BY created_at DESC;
$$;

-- 4. Delete every upload for a specific month (used by "Replace month")
CREATE OR REPLACE FUNCTION public.delete_month_uploads(p_year int, p_month int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  WITH d AS (
    DELETE FROM public.royalty_uploads
    WHERE period_year = p_year AND period_month = p_month
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM d;
  RETURN v_count;
END $$;

-- 5. Updated process_royalty_upload — now also populates monthly_stream_stats
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
  v_track_id uuid; v_release_id uuid;
  v_per_downloads bigint;
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_upload FROM public.royalty_uploads WHERE id = p_upload_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Upload not found'; END IF;

  -- Reverse prior earnings for this upload
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
    v_safe_net := ABS(COALESCE(v_row.net_amount, 0));

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

    IF v_safe_net = 0 AND COALESCE(v_row.quantity,0) = 0 THEN
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
    v_per_downloads := FLOOR(COALESCE(v_row.downloads,0)::numeric / array_length(v_matched_ids,1));

    UPDATE public.royalty_upload_rows
    SET matched_artist_ids = v_matched_ids, match_status = 'matched',
        assigned_amount_per_artist = v_per_artist
    WHERE id = v_row.id;
    v_total_matched := v_total_matched + 1;

    FOR v_artist IN SELECT unnest(v_matched_ids) AS id LOOP
      -- monthly_artist_earnings aggregate (unchanged)
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

      -- Best-effort track/release resolution for this artist
      v_track_id := NULL; v_release_id := NULL;
      IF v_row.track_title IS NOT NULL AND length(trim(v_row.track_title)) > 0 THEN
        SELECT t.id, t.release_id INTO v_track_id, v_release_id
        FROM public.tracks t
        WHERE t.primary_artist_id = v_artist.id
          AND lower(trim(t.title)) = lower(trim(v_row.track_title))
        LIMIT 1;
      END IF;

      -- Detailed monthly stream record (append-only per upload)
      INSERT INTO public.monthly_stream_stats
        (artist_id, release_id, track_id, upload_id, period_year, period_month,
         track_title, dsp_name, country, streams, downloads, quantity, revenue, currency)
      VALUES
        (v_artist.id, v_release_id, v_track_id, p_upload_id,
         v_upload.period_year, v_upload.period_month,
         v_row.track_title, v_row.dsp_name, v_row.country,
         COALESCE(v_row.quantity,0), v_per_downloads, COALESCE(v_row.quantity,0),
         v_per_artist, v_row.currency);
    END LOOP;
  END LOOP;

  UPDATE public.royalty_uploads
  SET matched_rows = v_total_matched, unmatched_rows = v_total_unmatched,
      status = 'completed', updated_at = now()
  WHERE id = p_upload_id;

  RETURN jsonb_build_object('matched',v_total_matched,'unmatched',v_total_unmatched,'zero_revenue',v_total_zero);
END $function$;

-- 6. Artist-level aggregate RPC (for dashboard cards)
CREATE OR REPLACE FUNCTION public.get_artist_stream_summary(p_artist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now date := date_trunc('month', now())::date;
  v_this_y int := extract(year from v_now)::int;
  v_this_m int := extract(month from v_now)::int;
  v_prev date := (v_now - interval '1 month')::date;
  v_prev_y int := extract(year from v_prev)::int;
  v_prev_m int := extract(month from v_prev)::int;
  v_lifetime bigint; v_lifetime_rev numeric;
  v_this bigint; v_prev_streams bigint;
  v_top_track text; v_top_dsp text; v_top_country text;
  v_monthly_rev numeric;
  v_release_count int;
BEGIN
  SELECT COALESCE(sum(streams),0), COALESCE(sum(revenue),0)
    INTO v_lifetime, v_lifetime_rev
  FROM monthly_stream_stats WHERE artist_id = p_artist_id;

  SELECT COALESCE(sum(streams),0) INTO v_this
  FROM monthly_stream_stats
  WHERE artist_id = p_artist_id AND period_year = v_this_y AND period_month = v_this_m;

  SELECT COALESCE(sum(streams),0) INTO v_prev_streams
  FROM monthly_stream_stats
  WHERE artist_id = p_artist_id AND period_year = v_prev_y AND period_month = v_prev_m;

  SELECT track_title INTO v_top_track FROM monthly_stream_stats
  WHERE artist_id = p_artist_id AND track_title IS NOT NULL
  GROUP BY track_title ORDER BY sum(streams) DESC LIMIT 1;

  SELECT dsp_name INTO v_top_dsp FROM monthly_stream_stats
  WHERE artist_id = p_artist_id AND dsp_name IS NOT NULL
  GROUP BY dsp_name ORDER BY sum(streams) DESC LIMIT 1;

  SELECT country INTO v_top_country FROM monthly_stream_stats
  WHERE artist_id = p_artist_id AND country IS NOT NULL
  GROUP BY country ORDER BY sum(streams) DESC LIMIT 1;

  SELECT COALESCE(sum(revenue),0) INTO v_monthly_rev
  FROM monthly_stream_stats
  WHERE artist_id = p_artist_id AND period_year = v_this_y AND period_month = v_this_m;

  SELECT count(*) INTO v_release_count FROM releases WHERE artist_id = p_artist_id;

  RETURN jsonb_build_object(
    'lifetime_streams', v_lifetime,
    'lifetime_revenue', v_lifetime_rev,
    'this_month_streams', v_this,
    'previous_month_streams', v_prev_streams,
    'growth_pct', CASE WHEN v_prev_streams > 0 THEN round(((v_this - v_prev_streams)::numeric / v_prev_streams::numeric) * 100, 2) ELSE NULL END,
    'top_track', v_top_track,
    'top_dsp', v_top_dsp,
    'top_country', v_top_country,
    'monthly_revenue', v_monthly_rev,
    'avg_streams_per_release', CASE WHEN v_release_count > 0 THEN round(v_lifetime::numeric / v_release_count::numeric, 2) ELSE 0 END
  );
END $$;
