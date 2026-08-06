-- 1. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  message text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.user_is_admin());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- 2. Streaming achievements
CREATE TABLE public.stream_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE,
  milestone bigint NOT NULL,
  streams_at_award bigint NOT NULL DEFAULT 0,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_stream_achievements_unique
  ON public.stream_achievements(artist_id, COALESCE(release_id, '00000000-0000-0000-0000-000000000000'::uuid), milestone);
GRANT SELECT ON public.stream_achievements TO authenticated;
GRANT ALL ON public.stream_achievements TO service_role;
ALTER TABLE public.stream_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists view own achievements" ON public.stream_achievements
  FOR SELECT TO authenticated USING (artist_id = auth.uid() OR public.user_is_admin());

-- 3. Artist reported snapshot (all distributors combined, no distributor exposed)
CREATE OR REPLACE FUNCTION public.get_artist_reported_snapshot(p_artist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_y int; v_m int; v_updated timestamptz;
  v_lifetime_streams bigint; v_lifetime_plays bigint; v_lifetime_rev numeric;
  v_p_streams bigint; v_p_plays bigint; v_p_rev numeric;
  v_prev_streams bigint;
  v_monthly jsonb; v_top_tracks jsonb; v_top_releases jsonb;
BEGIN
  IF p_artist_id <> auth.uid() AND NOT public.user_is_admin()
     AND NOT public.has_account_access(p_artist_id, 'viewer'::account_role) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT period_year, period_month INTO v_y, v_m
  FROM public.monthly_stream_stats
  WHERE artist_id = p_artist_id
  ORDER BY period_year DESC, period_month DESC
  LIMIT 1;

  SELECT max(created_at) INTO v_updated
  FROM public.monthly_stream_stats WHERE artist_id = p_artist_id;

  SELECT COALESCE(sum(streams),0), COALESCE(sum(streams + downloads),0), COALESCE(sum(revenue),0)
    INTO v_lifetime_streams, v_lifetime_plays, v_lifetime_rev
  FROM public.monthly_stream_stats WHERE artist_id = p_artist_id;

  SELECT COALESCE(sum(streams),0), COALESCE(sum(streams + downloads),0), COALESCE(sum(revenue),0)
    INTO v_p_streams, v_p_plays, v_p_rev
  FROM public.monthly_stream_stats
  WHERE artist_id = p_artist_id AND period_year = v_y AND period_month = v_m;

  SELECT COALESCE(sum(streams),0) INTO v_prev_streams
  FROM public.monthly_stream_stats
  WHERE artist_id = p_artist_id
    AND make_date(period_year, period_month, 1) = (make_date(COALESCE(v_y, 2000), COALESCE(v_m, 1), 1) - interval '1 month')::date;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.period_year, t.period_month), '[]'::jsonb) INTO v_monthly
  FROM (
    SELECT period_year, period_month,
           sum(streams)::bigint AS streams,
           sum(streams + downloads)::bigint AS plays,
           sum(revenue)::numeric AS earnings
    FROM public.monthly_stream_stats
    WHERE artist_id = p_artist_id
    GROUP BY period_year, period_month
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.streams DESC), '[]'::jsonb) INTO v_top_tracks
  FROM (
    SELECT track_title AS title,
           sum(streams)::bigint AS streams,
           sum(streams + downloads)::bigint AS plays,
           sum(revenue)::numeric AS earnings
    FROM public.monthly_stream_stats
    WHERE artist_id = p_artist_id AND track_title IS NOT NULL
    GROUP BY track_title
    ORDER BY streams DESC LIMIT 10
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.streams DESC), '[]'::jsonb) INTO v_top_releases
  FROM (
    SELECT m.release_id, COALESCE(r.title, 'Unknown release') AS title, r.cover_art_url,
           sum(m.streams)::bigint AS streams,
           sum(m.streams + m.downloads)::bigint AS plays,
           sum(m.revenue)::numeric AS earnings
    FROM public.monthly_stream_stats m
    LEFT JOIN public.releases r ON r.id = m.release_id
    WHERE m.artist_id = p_artist_id AND m.release_id IS NOT NULL
    GROUP BY m.release_id, r.title, r.cover_art_url
    ORDER BY streams DESC LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'period_year', v_y,
    'period_month', v_m,
    'last_updated', v_updated,
    'period_streams', COALESCE(v_p_streams,0),
    'period_plays', COALESCE(v_p_plays,0),
    'period_earnings', COALESCE(v_p_rev,0),
    'previous_period_streams', COALESCE(v_prev_streams,0),
    'growth_pct', CASE WHEN COALESCE(v_prev_streams,0) > 0
                       THEN round(((v_p_streams - v_prev_streams)::numeric / v_prev_streams::numeric) * 100, 2)
                       ELSE NULL END,
    'lifetime_streams', COALESCE(v_lifetime_streams,0),
    'lifetime_plays', COALESCE(v_lifetime_plays,0),
    'lifetime_earnings', COALESCE(v_lifetime_rev,0),
    'monthly', v_monthly,
    'top_tracks', v_top_tracks,
    'top_releases', v_top_releases
  );
END $$;

-- 4. Release reported stats
CREATE OR REPLACE FUNCTION public.get_release_reported_stats(p_release_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_artist uuid; v_y int; v_m int; v_updated timestamptz;
  v_ls bigint; v_lp bigint; v_lr numeric; v_ps bigint; v_pp bigint; v_pr numeric; v_monthly jsonb;
BEGIN
  SELECT artist_id INTO v_artist FROM public.releases WHERE id = p_release_id;
  IF v_artist IS NULL THEN RETURN '{}'::jsonb; END IF;
  IF v_artist <> auth.uid() AND NOT public.user_is_admin()
     AND NOT public.has_account_access(v_artist, 'viewer'::account_role) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT period_year, period_month INTO v_y, v_m
  FROM public.monthly_stream_stats WHERE release_id = p_release_id
  ORDER BY period_year DESC, period_month DESC LIMIT 1;

  SELECT max(created_at) INTO v_updated FROM public.monthly_stream_stats WHERE release_id = p_release_id;

  SELECT COALESCE(sum(streams),0), COALESCE(sum(streams+downloads),0), COALESCE(sum(revenue),0)
    INTO v_ls, v_lp, v_lr
  FROM public.monthly_stream_stats WHERE release_id = p_release_id;

  SELECT COALESCE(sum(streams),0), COALESCE(sum(streams+downloads),0), COALESCE(sum(revenue),0)
    INTO v_ps, v_pp, v_pr
  FROM public.monthly_stream_stats
  WHERE release_id = p_release_id AND period_year = v_y AND period_month = v_m;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.period_year, t.period_month), '[]'::jsonb) INTO v_monthly
  FROM (
    SELECT period_year, period_month, sum(streams)::bigint AS streams,
           sum(streams+downloads)::bigint AS plays, sum(revenue)::numeric AS earnings
    FROM public.monthly_stream_stats WHERE release_id = p_release_id
    GROUP BY period_year, period_month
  ) t;

  RETURN jsonb_build_object(
    'period_year', v_y, 'period_month', v_m, 'last_updated', v_updated,
    'period_streams', COALESCE(v_ps,0), 'period_plays', COALESCE(v_pp,0), 'period_earnings', COALESCE(v_pr,0),
    'lifetime_streams', COALESCE(v_ls,0), 'lifetime_plays', COALESCE(v_lp,0), 'lifetime_earnings', COALESCE(v_lr,0),
    'monthly', v_monthly
  );
END $$;

-- 5. Award achievements
CREATE OR REPLACE FUNCTION public.award_stream_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_milestones bigint[] := ARRAY[100,1000,5000,10000,50000,100000,500000,1000000,5000000,10000000];
  v_rec RECORD; v_ms bigint; v_new jsonb := '[]'::jsonb; v_id uuid;
BEGIN
  FOR v_rec IN
    SELECT m.artist_id, m.release_id, sum(m.streams)::bigint AS streams
    FROM public.monthly_stream_stats m
    WHERE m.release_id IS NOT NULL
    GROUP BY m.artist_id, m.release_id
  LOOP
    FOREACH v_ms IN ARRAY v_milestones LOOP
      IF v_rec.streams >= v_ms THEN
        INSERT INTO public.stream_achievements (artist_id, release_id, milestone, streams_at_award)
        VALUES (v_rec.artist_id, v_rec.release_id, v_ms, v_rec.streams)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_id;
        IF v_id IS NOT NULL THEN
          v_new := v_new || jsonb_build_object(
            'id', v_id, 'artist_id', v_rec.artist_id, 'release_id', v_rec.release_id,
            'milestone', v_ms, 'streams', v_rec.streams);
          v_id := NULL;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('new_count', jsonb_array_length(v_new), 'new', v_new);
END $$;
