-- Separate uniqueness for release-level and track-title-level achievements.
-- The previous COALESCE(release_id, zero UUID) index collapsed every unlinked
-- track for the same artist/milestone into one record.
DROP INDEX IF EXISTS public.idx_stream_achievements_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stream_achievements_release_unique
ON public.stream_achievements (artist_id, release_id, milestone)
WHERE release_id IS NOT NULL;

CREATE TEMP TABLE _achievement_ids_before_track_index_fix ON COMMIT DROP AS
SELECT id FROM public.stream_achievements;

SELECT public.award_stream_achievements();

WITH monthly AS (
  SELECT artist_id,lower(trim(track_title)) track_key,period_year,period_month,sum(streams)::bigint period_streams
  FROM public.monthly_stream_stats
  WHERE release_id IS NULL AND track_title IS NOT NULL AND trim(track_title)<>''
  GROUP BY artist_id,lower(trim(track_title)),period_year,period_month
), running AS (
  SELECT artist_id,track_key,period_year,period_month,
         sum(period_streams) OVER(PARTITION BY artist_id,track_key ORDER BY period_year,period_month ROWS UNBOUNDED PRECEDING)::bigint cumulative_streams
  FROM monthly
), crossing AS (
  SELECT DISTINCT ON (a.id) a.id,r.period_year,r.period_month,r.cumulative_streams
  FROM public.stream_achievements a
  JOIN running r ON r.artist_id=a.artist_id AND r.track_key=lower(trim(a.track_title)) AND r.cumulative_streams>=a.milestone
  WHERE a.release_id IS NULL
    AND NOT EXISTS(SELECT 1 FROM _achievement_ids_before_track_index_fix old WHERE old.id=a.id)
  ORDER BY a.id,r.period_year,r.period_month
)
UPDATE public.stream_achievements a
SET streams_at_award=c.cumulative_streams,
    awarded_at=(make_timestamptz(c.period_year,c.period_month,1,0,0,0,'UTC')+interval '1 month'-interval '1 second')
FROM crossing c WHERE a.id=c.id;

INSERT INTO public.notifications(user_id,type,title,message,link,metadata)
SELECT a.artist_id,'achievement',
 '🏆 '||CASE WHEN a.milestone>=1000000 THEN (a.milestone/1000000)::text||'M' WHEN a.milestone>=1000 THEN (a.milestone/1000)::text||'K' ELSE a.milestone::text END||' STREAMS unlocked — '||COALESCE(a.track_title,r.title,'Your catalogue'),
 'Congratulations '||COALESCE(ar.name,'Artist')||'! '||COALESCE(a.track_title,r.title,'Your catalogue')||' has reached '||to_char(a.milestone,'FM999,999,999,999')||' lifetime streams.',
 '/achievements',jsonb_build_object('achievement_id',a.id,'milestone',a.milestone,'release_id',a.release_id,'track_title',a.track_title,'restored_by_backfill',true)
FROM public.stream_achievements a
LEFT JOIN public.releases r ON r.id=a.release_id
LEFT JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS(SELECT 1 FROM _achievement_ids_before_track_index_fix old WHERE old.id=a.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.achievement_email_deliveries(achievement_id,artist_id,recipient_email,status,attempt_count)
SELECT a.id,a.artist_id,ar.email,'pending',0
FROM public.stream_achievements a JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS(SELECT 1 FROM _achievement_ids_before_track_index_fix old WHERE old.id=a.id)
ON CONFLICT(achievement_id) DO NOTHING;
