-- Track-level achievements for legitimate royalty stats whose catalogue release
-- is not present yet. This avoids fabricating release records just to show milestones.
ALTER TABLE public.stream_achievements ADD COLUMN IF NOT EXISTS track_title text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stream_achievements_unlinked_track_unique
ON public.stream_achievements (artist_id, lower(trim(track_title)), milestone)
WHERE release_id IS NULL AND track_title IS NOT NULL AND trim(track_title) <> '';

CREATE OR REPLACE FUNCTION public.award_stream_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_milestones bigint[] := ARRAY[100,1000,5000,10000,50000,100000,500000,1000000,5000000,10000000];
  v_rec RECORD;
  v_ms bigint;
  v_new jsonb := '[]'::jsonb;
  v_id uuid;
BEGIN
  FOR v_rec IN
    SELECT m.artist_id, m.release_id,
      CASE WHEN m.release_id IS NULL THEN min(trim(m.track_title)) ELSE NULL END AS track_title,
      sum(m.streams)::bigint AS streams
    FROM public.monthly_stream_stats m
    WHERE m.release_id IS NOT NULL
       OR (m.track_title IS NOT NULL AND trim(m.track_title) <> '')
    GROUP BY m.artist_id, m.release_id,
      CASE WHEN m.release_id IS NULL THEN lower(trim(m.track_title)) ELSE NULL END
  LOOP
    FOREACH v_ms IN ARRAY v_milestones LOOP
      IF v_rec.streams >= v_ms THEN
        INSERT INTO public.stream_achievements
          (artist_id, release_id, track_title, milestone, streams_at_award)
        VALUES
          (v_rec.artist_id, v_rec.release_id, v_rec.track_title, v_ms, v_rec.streams)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_id;
        IF v_id IS NOT NULL THEN
          v_new := v_new || jsonb_build_object(
            'id', v_id, 'artist_id', v_rec.artist_id, 'release_id', v_rec.release_id,
            'track_title', v_rec.track_title, 'milestone', v_ms, 'streams', v_rec.streams);
          v_id := NULL;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('new_count', jsonb_array_length(v_new), 'new', v_new);
END
$function$;

CREATE TEMP TABLE _achievement_ids_before_track_level ON COMMIT DROP AS
SELECT id FROM public.stream_achievements;

SELECT public.award_stream_achievements();

-- Set an approximate historical award date only for newly created track-level
-- awards using the earliest reporting month in which cumulative streams crossed it.
WITH monthly AS (
  SELECT artist_id, lower(trim(track_title)) AS track_key, period_year, period_month,
         sum(streams)::bigint AS period_streams
  FROM public.monthly_stream_stats
  WHERE release_id IS NULL AND track_title IS NOT NULL AND trim(track_title) <> ''
  GROUP BY artist_id, lower(trim(track_title)), period_year, period_month
), running AS (
  SELECT artist_id, track_key, period_year, period_month,
         sum(period_streams) OVER (PARTITION BY artist_id, track_key ORDER BY period_year, period_month ROWS UNBOUNDED PRECEDING)::bigint AS cumulative_streams
  FROM monthly
), crossing AS (
  SELECT DISTINCT ON (a.id) a.id, r.period_year, r.period_month, r.cumulative_streams
  FROM public.stream_achievements a
  JOIN running r ON r.artist_id=a.artist_id AND r.track_key=lower(trim(a.track_title)) AND r.cumulative_streams>=a.milestone
  WHERE a.release_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM _achievement_ids_before_track_level old WHERE old.id=a.id)
  ORDER BY a.id, r.period_year, r.period_month
)
UPDATE public.stream_achievements a
SET streams_at_award=c.cumulative_streams,
    awarded_at=(make_timestamptz(c.period_year,c.period_month,1,0,0,0,'UTC') + interval '1 month' - interval '1 second')
FROM crossing c WHERE a.id=c.id;

INSERT INTO public.notifications (user_id,type,title,message,link,metadata)
SELECT a.artist_id,'achievement',
  '🏆 ' || CASE WHEN a.milestone>=1000000 THEN (a.milestone/1000000)::text || 'M' WHEN a.milestone>=1000 THEN (a.milestone/1000)::text || 'K' ELSE a.milestone::text END || ' STREAMS unlocked — ' || COALESCE(a.track_title,r.title,'Your catalogue'),
  'Congratulations ' || COALESCE(ar.name,'Artist') || '! ' || COALESCE(a.track_title,r.title,'Your catalogue') || ' has reached ' || to_char(a.milestone,'FM999,999,999,999') || ' lifetime streams.',
  '/achievements', jsonb_build_object('achievement_id',a.id,'milestone',a.milestone,'release_id',a.release_id,'track_title',a.track_title,'restored_by_backfill',true)
FROM public.stream_achievements a
LEFT JOIN public.releases r ON r.id=a.release_id
LEFT JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_track_level old WHERE old.id=a.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.achievement_email_deliveries (achievement_id,artist_id,recipient_email,status,attempt_count)
SELECT a.id,a.artist_id,ar.email,'pending',0
FROM public.stream_achievements a
JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_track_level old WHERE old.id=a.id)
ON CONFLICT (achievement_id) DO NOTHING;
