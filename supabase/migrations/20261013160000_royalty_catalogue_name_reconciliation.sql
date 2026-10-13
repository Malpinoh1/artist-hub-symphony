-- Reconcile historical royalty stats against the existing catalogue by normalized
-- artist display name and exact track/release title. Only unique catalogue matches
-- are linked; unmatched and ambiguous rows remain untouched.
CREATE TEMP TABLE _achievement_ids_before_catalogue_repair ON COMMIT DROP AS
SELECT id FROM public.stream_achievements;

WITH candidates AS (
  SELECT m.id AS stat_id, r.id AS release_id,
         CASE WHEN EXISTS (
           SELECT 1 FROM public.release_tracks rt
           WHERE rt.release_id=r.id
             AND lower(trim(rt.title))=lower(trim(m.track_title))
         ) THEN 1 ELSE 2 END AS priority
  FROM public.monthly_stream_stats m
  JOIN public.artists a ON a.id=m.artist_id
  JOIN public.releases r
    ON lower(trim(coalesce(r.artist_name,'')))=lower(trim(coalesce(a.name,'')))
   AND (
     EXISTS (SELECT 1 FROM public.release_tracks rt
             WHERE rt.release_id=r.id AND lower(trim(rt.title))=lower(trim(m.track_title)))
     OR lower(trim(r.title))=lower(trim(m.track_title))
   )
  WHERE m.release_id IS NULL
    AND m.track_title IS NOT NULL AND trim(m.track_title)<>''
), best AS (
  SELECT stat_id, min(priority) AS priority
  FROM candidates GROUP BY stat_id
), unique_matches AS (
  SELECT c.stat_id, min(c.release_id) AS release_id
  FROM candidates c JOIN best b ON b.stat_id=c.stat_id AND b.priority=c.priority
  GROUP BY c.stat_id
  HAVING count(DISTINCT c.release_id)=1
)
UPDATE public.monthly_stream_stats m
SET release_id=u.release_id,
    track_id=(
      SELECT min(t.id)
      FROM public.tracks t
      WHERE t.release_id=u.release_id
        AND lower(trim(t.title))=lower(trim(m.track_title))
      HAVING count(*)=1
    )
FROM unique_matches u
WHERE m.id=u.stat_id AND m.release_id IS NULL;

-- Fix future royalty ingestion: use catalogue track rows even when artist_id
-- differs from the canonical release artist_id, provided artist name and title
-- uniquely identify the release. Never override an identifier match.
DO $$
DECLARE v_def text;
v_old text := $old$      -- Fallback title-only match when ISRC/UPC didn't identify a specific track
      IF v_track_id IS NULL AND v_release_id IS NULL AND v_row.track_title IS NOT NULL AND length(trim(v_row.track_title)) > 0 THEN
        SELECT t.id, t.release_id INTO v_track_id, v_release_id
        FROM public.tracks t
        WHERE t.primary_artist_id = v_artist.id
          AND lower(trim(t.title)) = lower(trim(v_row.track_title))
        LIMIT 1;
      END IF;$old$;
v_new text := $new$      -- Fallback: uniquely resolve track title against the artist's catalogue.
      -- Compare display names as well as IDs because legacy accounts can have duplicate artist rows.
      IF v_release_id IS NULL AND v_row.track_title IS NOT NULL AND length(trim(v_row.track_title)) > 0 THEN
        WITH candidate_releases AS (
          SELECT DISTINCT r.id AS release_id
          FROM public.releases r
          JOIN public.artists owner ON owner.id = v_artist.id
          WHERE lower(trim(coalesce(r.artist_name,''))) = lower(trim(coalesce(owner.name,'')))
            AND (
              lower(trim(r.title)) = lower(trim(v_row.track_title))
              OR EXISTS (
                SELECT 1 FROM public.release_tracks rt
                WHERE rt.release_id=r.id AND lower(trim(rt.title))=lower(trim(v_row.track_title))
              )
            )
        )
        SELECT cr.release_id INTO v_release_id
        FROM candidate_releases cr
        HAVING count(*) = 1;

        IF v_release_id IS NOT NULL THEN
          SELECT t.id INTO v_track_id
          FROM public.tracks t
          WHERE t.release_id = v_release_id
            AND lower(trim(t.title)) = lower(trim(v_row.track_title))
          HAVING count(*) = 1;
        END IF;
      END IF;$new$;
BEGIN
  v_def := pg_get_functiondef('public.process_royalty_upload(uuid)'::regprocedure);
  IF position(v_old IN v_def) > 0 THEN
    v_def := replace(v_def, v_old, v_new);
    EXECUTE v_def;
  ELSIF position('legacy accounts can have duplicate artist rows' IN v_def) = 0 THEN
    RAISE EXCEPTION 'Could not patch royalty processor title fallback safely';
  END IF;
END $$;

SELECT public.award_stream_achievements();

-- Notify only achievements created during this repair, and create one durable
-- delivery job each. Existing award history and notification state are preserved.
WITH monthly AS (
  SELECT artist_id,release_id,period_year,period_month,SUM(streams)::bigint AS period_streams
  FROM public.monthly_stream_stats WHERE release_id IS NOT NULL
  GROUP BY artist_id,release_id,period_year,period_month
), running AS (
  SELECT artist_id,release_id,period_year,period_month,
         SUM(period_streams) OVER (PARTITION BY artist_id,release_id ORDER BY period_year,period_month ROWS UNBOUNDED PRECEDING)::bigint cumulative_streams
  FROM monthly
), crossing AS (
  SELECT DISTINCT ON (a.id) a.id,r.period_year,r.period_month,r.cumulative_streams
  FROM public.stream_achievements a
  JOIN running r ON r.artist_id=a.artist_id AND r.release_id=a.release_id AND r.cumulative_streams>=a.milestone
  WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_catalogue_repair old WHERE old.id=a.id)
    AND a.release_id IS NOT NULL
  ORDER BY a.id,r.period_year,r.period_month
)
UPDATE public.stream_achievements a
SET streams_at_award=c.cumulative_streams,
    awarded_at=(make_timestamptz(c.period_year,c.period_month,1,0,0,0,'UTC') + interval '1 month' - interval '1 second')
FROM crossing c WHERE a.id=c.id;

INSERT INTO public.notifications (user_id,type,title,message,link,metadata)
SELECT a.artist_id,'achievement',
  '🏆 ' || CASE WHEN a.milestone>=1000000 THEN (a.milestone/1000000)::text || 'M' WHEN a.milestone>=1000 THEN (a.milestone/1000)::text || 'K' ELSE a.milestone::text END || ' STREAMS unlocked — ' || COALESCE(r.title,'Your catalogue'),
  'Congratulations ' || COALESCE(ar.name,'Artist') || '! ' || COALESCE(r.title,'Your catalogue') || ' has reached ' || to_char(a.milestone,'FM999,999,999,999') || ' lifetime streams.',
  '/achievements', jsonb_build_object('achievement_id',a.id,'milestone',a.milestone,'release_id',a.release_id,'restored_by_backfill',true)
FROM public.stream_achievements a
LEFT JOIN public.releases r ON r.id=a.release_id
LEFT JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_catalogue_repair old WHERE old.id=a.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.achievement_email_deliveries (achievement_id,artist_id,recipient_email,status,attempt_count)
SELECT a.id,a.artist_id,ar.email,'pending',0
FROM public.stream_achievements a
JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_catalogue_repair old WHERE old.id=a.id)
ON CONFLICT (achievement_id) DO NOTHING;
