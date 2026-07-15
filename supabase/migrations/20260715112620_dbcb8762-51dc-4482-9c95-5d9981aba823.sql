
-- Performance indexes for stream analytics
CREATE INDEX IF NOT EXISTS idx_mss_artist_period ON public.monthly_stream_stats (artist_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_mss_release ON public.monthly_stream_stats (release_id) WHERE release_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mss_track ON public.monthly_stream_stats (track_id) WHERE track_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mss_upload ON public.monthly_stream_stats (upload_id);
CREATE INDEX IF NOT EXISTS idx_mss_dsp ON public.monthly_stream_stats (dsp_name);
CREATE INDEX IF NOT EXISTS idx_mss_period ON public.monthly_stream_stats (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_rur_upload ON public.royalty_upload_rows (upload_id);
CREATE INDEX IF NOT EXISTS idx_rur_matched ON public.royalty_upload_rows USING GIN (matched_artist_ids);

-- Rebuild all historical stream stats from existing royalty_upload_rows
-- Safe: process_royalty_upload deletes prior stats/earnings per upload_id before reinserting.
CREATE OR REPLACE FUNCTION public.rebuild_all_stream_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_upload RECORD;
  v_count int := 0;
  v_failed int := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  FOR v_upload IN
    SELECT id, file_name FROM public.royalty_uploads ORDER BY created_at ASC
  LOOP
    BEGIN
      PERFORM public.process_royalty_upload(v_upload.id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object('upload_id', v_upload.id, 'file', v_upload.file_name, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object('reprocessed', v_count, 'failed', v_failed, 'errors', v_errors);
END $$;

-- Platform-wide stream analytics for admin
CREATE OR REPLACE FUNCTION public.get_platform_stream_analytics(
  p_year int DEFAULT NULL,
  p_month int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_streams bigint;
  v_total_revenue numeric;
  v_by_month jsonb;
  v_by_dsp jsonb;
  v_top_artists jsonb;
  v_top_tracks jsonb;
  v_by_release jsonb;
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT COALESCE(SUM(streams),0), COALESCE(SUM(revenue),0)
    INTO v_total_streams, v_total_revenue
  FROM public.monthly_stream_stats
  WHERE (p_year IS NULL OR period_year = p_year)
    AND (p_month IS NULL OR period_month = p_month);

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.period_year, t.period_month), '[]'::jsonb) INTO v_by_month
  FROM (
    SELECT period_year, period_month, SUM(streams)::bigint AS streams, SUM(revenue)::numeric AS revenue
    FROM public.monthly_stream_stats
    WHERE (p_year IS NULL OR period_year = p_year)
    GROUP BY period_year, period_month
    ORDER BY period_year, period_month
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.streams DESC), '[]'::jsonb) INTO v_by_dsp
  FROM (
    SELECT dsp_name, SUM(streams)::bigint AS streams, SUM(revenue)::numeric AS revenue
    FROM public.monthly_stream_stats
    WHERE dsp_name IS NOT NULL
      AND (p_year IS NULL OR period_year = p_year)
      AND (p_month IS NULL OR period_month = p_month)
    GROUP BY dsp_name
    ORDER BY streams DESC LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.streams DESC), '[]'::jsonb) INTO v_top_artists
  FROM (
    SELECT m.artist_id, a.name, a.account_name,
           SUM(m.streams)::bigint AS streams,
           SUM(m.revenue)::numeric AS revenue
    FROM public.monthly_stream_stats m
    LEFT JOIN public.artists a ON a.id = m.artist_id
    WHERE (p_year IS NULL OR m.period_year = p_year)
      AND (p_month IS NULL OR m.period_month = p_month)
    GROUP BY m.artist_id, a.name, a.account_name
    ORDER BY streams DESC LIMIT 100
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.streams DESC), '[]'::jsonb) INTO v_top_tracks
  FROM (
    SELECT track_title,
           SUM(streams)::bigint AS streams,
           SUM(revenue)::numeric AS revenue
    FROM public.monthly_stream_stats
    WHERE track_title IS NOT NULL
      AND (p_year IS NULL OR period_year = p_year)
      AND (p_month IS NULL OR period_month = p_month)
    GROUP BY track_title
    ORDER BY streams DESC LIMIT 100
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.streams DESC), '[]'::jsonb) INTO v_by_release
  FROM (
    SELECT m.release_id, r.title,
           SUM(m.streams)::bigint AS streams,
           SUM(m.revenue)::numeric AS revenue
    FROM public.monthly_stream_stats m
    LEFT JOIN public.releases r ON r.id = m.release_id
    WHERE m.release_id IS NOT NULL
      AND (p_year IS NULL OR m.period_year = p_year)
      AND (p_month IS NULL OR m.period_month = p_month)
    GROUP BY m.release_id, r.title
    ORDER BY streams DESC LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'total_streams', v_total_streams,
    'total_revenue', v_total_revenue,
    'by_month', v_by_month,
    'by_dsp', v_by_dsp,
    'top_artists', v_top_artists,
    'top_tracks', v_top_tracks,
    'by_release', v_by_release
  );
END $$;
