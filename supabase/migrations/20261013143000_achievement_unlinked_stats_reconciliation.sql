-- Safely associate previously unlinked streaming rows only when the same artist has
-- exactly one release whose title equals the statement track title.
-- No royalty balances or source statement rows are changed.
WITH unique_release_matches AS (
  SELECT m.id, (array_agg(r.id))[1] AS release_id
  FROM public.monthly_stream_stats m
  JOIN public.releases r
    ON r.artist_id=m.artist_id
   AND lower(trim(r.title))=lower(trim(m.track_title))
  WHERE m.release_id IS NULL
    AND m.track_title IS NOT NULL
    AND trim(m.track_title)<>''
  GROUP BY m.id
  HAVING count(DISTINCT r.id)=1
)
UPDATE public.monthly_stream_stats m
SET release_id=u.release_id
FROM unique_release_matches u
WHERE m.id=u.id
  AND m.release_id IS NULL;

-- Preserve the pre-existing achievement history and identify only new records
-- created by the post-reconciliation eligibility sweep.
CREATE TEMP TABLE _achievement_ids_before_reconciliation ON COMMIT DROP AS
SELECT id FROM public.stream_achievements;

SELECT public.award_stream_achievements();

WITH monthly AS (
  SELECT artist_id,release_id,period_year,period_month,SUM(streams)::bigint AS period_streams
  FROM public.monthly_stream_stats
  WHERE release_id IS NOT NULL
  GROUP BY artist_id,release_id,period_year,period_month
), running AS (
  SELECT artist_id,release_id,period_year,period_month,
         SUM(period_streams) OVER (PARTITION BY artist_id,release_id ORDER BY period_year,period_month ROWS UNBOUNDED PRECEDING)::bigint AS cumulative_streams
  FROM monthly
), crossing AS (
  SELECT DISTINCT ON (a.id) a.id,r.period_year,r.period_month,r.cumulative_streams
  FROM public.stream_achievements a
  JOIN running r ON r.artist_id=a.artist_id AND r.release_id=a.release_id AND r.cumulative_streams>=a.milestone
  WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_reconciliation old WHERE old.id=a.id)
    AND a.release_id IS NOT NULL
  ORDER BY a.id,r.period_year,r.period_month
)
UPDATE public.stream_achievements a
SET streams_at_award=c.cumulative_streams,
    awarded_at=(make_timestamptz(c.period_year,c.period_month,1,0,0,0,'UTC') + interval '1 month' - interval '1 second')
FROM crossing c
WHERE a.id=c.id;

INSERT INTO public.notifications (user_id,type,title,message,link,metadata)
SELECT a.artist_id,'achievement',
  '🏆 ' || CASE WHEN a.milestone>=1000000 THEN (a.milestone/1000000)::text || 'M' WHEN a.milestone>=1000 THEN (a.milestone/1000)::text || 'K' ELSE a.milestone::text END || ' STREAMS unlocked — ' || COALESCE(r.title,'Your catalogue'),
  'Congratulations ' || COALESCE(ar.name,'Artist') || '! ' || COALESCE(r.title,'Your catalogue') || ' has reached ' || to_char(a.milestone,'FM999,999,999,999') || ' lifetime streams.',
  '/achievements', jsonb_build_object('achievement_id',a.id,'milestone',a.milestone,'release_id',a.release_id,'restored_by_backfill',true)
FROM public.stream_achievements a
LEFT JOIN public.releases r ON r.id=a.release_id
LEFT JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_reconciliation old WHERE old.id=a.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.achievement_email_deliveries (achievement_id,artist_id,recipient_email,status,attempt_count)
SELECT a.id,a.artist_id,ar.email,'pending',0
FROM public.stream_achievements a
JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_reconciliation old WHERE old.id=a.id)
ON CONFLICT (achievement_id) DO NOTHING;
