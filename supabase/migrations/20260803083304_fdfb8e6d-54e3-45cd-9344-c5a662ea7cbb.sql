CREATE OR REPLACE FUNCTION public.get_platform_stream_analytics(p_year integer DEFAULT NULL::integer, p_month integer DEFAULT NULL::integer, p_distributor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_streams bigint;
  v_total_revenue numeric;
  v_by_month jsonb;
  v_by_dsp jsonb;
  v_top_artists jsonb;
  v_top_tracks jsonb;
  v_by_release jsonb;
  v_by_distributor jsonb;
  v_dist text := NULLIF(p_distributor, '');
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;

  SELECT COALESCE(SUM(streams),0), COALESCE(SUM(revenue),0)
    INTO v_total_streams, v_total_revenue
  FROM public.monthly_stream_stats
  WHERE (p_year IS NULL OR period_year = p_year)
    AND (p_month IS NULL OR period_month = p_month)
    AND (v_dist IS NULL OR distributor_code = v_dist);

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.period_year, t.period_month), '[]'::jsonb) INTO v_by_month
  FROM (
    SELECT period_year, period_month, SUM(streams)::bigint AS streams, SUM(revenue)::numeric AS revenue
    FROM public.monthly_stream_stats
    WHERE (p_year IS NULL OR period_year = p_year)
      AND (v_dist IS NULL OR distributor_code = v_dist)
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
      AND (v_dist IS NULL OR distributor_code = v_dist)
    GROUP BY dsp_name
    ORDER BY streams DESC LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.streams DESC), '[]'::jsonb) INTO v_by_distributor
  FROM (
    SELECT COALESCE(m.distributor_code, 'unknown') AS distributor_code,
           COALESCE(d.name, 'Unknown / legacy') AS distributor_name,
           SUM(m.streams)::bigint AS streams,
           SUM(m.revenue)::numeric AS revenue
    FROM public.monthly_stream_stats m
    LEFT JOIN public.distributors d ON d.code = m.distributor_code
    WHERE (p_year IS NULL OR m.period_year = p_year)
      AND (p_month IS NULL OR m.period_month = p_month)
    GROUP BY 1, 2
    ORDER BY streams DESC
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
      AND (v_dist IS NULL OR m.distributor_code = v_dist)
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
      AND (v_dist IS NULL OR distributor_code = v_dist)
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
      AND (v_dist IS NULL OR m.distributor_code = v_dist)
    GROUP BY m.release_id, r.title
    ORDER BY streams DESC LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'total_streams', v_total_streams,
    'total_revenue', v_total_revenue,
    'by_month', v_by_month,
    'by_dsp', v_by_dsp,
    'by_distributor', v_by_distributor,
    'top_artists', v_top_artists,
    'top_tracks', v_top_tracks,
    'by_release', v_by_release
  );
END $function$;

DROP FUNCTION IF EXISTS public.get_platform_stream_analytics(integer, integer);