-- Achievement reliability, delivery ledger, and safe automatic awarding.
-- Existing achievement rows and their award timestamps are preserved.
CREATE TABLE IF NOT EXISTS public.achievement_email_deliveries (
  achievement_id uuid PRIMARY KEY REFERENCES public.stream_achievements(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  recipient_email text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','failed','suppressed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

ALTER TABLE public.achievement_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.achievement_email_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.achievement_email_deliveries TO service_role;

CREATE INDEX IF NOT EXISTS idx_achievement_email_deliveries_retry
  ON public.achievement_email_deliveries(status, updated_at)
  WHERE status IN ('pending','failed');

-- One in-app achievement notification per achievement, even under retries/concurrent sweeps.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_achievement
  ON public.notifications ((metadata->>'achievement_id'))
  WHERE type = 'achievement' AND metadata ? 'achievement_id';

-- The royalty processor is the common ingestion path. Award only after the batch has
-- been written, so the existing aggregation runs once per import, not once per row.
DO $$
DECLARE
  v_def text;
  v_return text := '  RETURN jsonb_build_object(''matched'',v_total_matched,''unmatched'',v_total_unmatched,''zero_revenue'',v_total_zero,''distributor'',v_distributor);';
BEGIN
  v_def := pg_get_functiondef('public.process_royalty_upload(uuid)'::regprocedure);
  IF position('PERFORM public.award_stream_achievements();' IN v_def) = 0 THEN
    IF position(v_return IN v_def) = 0 THEN
      RAISE EXCEPTION 'Could not safely patch process_royalty_upload: expected return statement not found';
    END IF;
    v_def := replace(
      v_def,
      v_return,
      '  PERFORM public.award_stream_achievements();' || E'\n\n' || v_return
    );
    EXECUTE v_def;
  END IF;
END $$;

-- Capture pre-existing IDs so only achievements created by this repair receive
-- reconstructed threshold dates and notification jobs.
CREATE TEMP TABLE _achievement_ids_before_repair ON COMMIT DROP AS
SELECT id FROM public.stream_achievements;

-- Idempotent all-catalogue backfill using the same authoritative milestone RPC.
-- ON CONFLICT in that function preserves valid pre-existing achievements.
SELECT public.award_stream_achievements();

-- For newly restored rows, derive the first reporting month where cumulative
-- streams reached each milestone. Existing achievement history is never rewritten.
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
  WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_repair old WHERE old.id=a.id)
    AND a.release_id IS NOT NULL
  ORDER BY a.id,r.period_year,r.period_month
)
UPDATE public.stream_achievements a
SET streams_at_award=c.cumulative_streams,
    awarded_at=(make_timestamptz(c.period_year,c.period_month,1,0,0,0,'UTC') + interval '1 month' - interval '1 second')
FROM crossing c
WHERE a.id=c.id;

-- Queue an in-app notification and one durable email-delivery job per restored
-- achievement. Delivery itself is performed by the existing authenticated worker.
INSERT INTO public.notifications (user_id,type,title,message,link,metadata)
SELECT a.artist_id,'achievement',
  '🏆 ' || CASE WHEN a.milestone>=1000000 THEN (a.milestone/1000000)::text || 'M' WHEN a.milestone>=1000 THEN (a.milestone/1000)::text || 'K' ELSE a.milestone::text END || ' STREAMS unlocked — ' || COALESCE(r.title,'Your catalogue'),
  'Congratulations ' || COALESCE(ar.name,'Artist') || '! ' || COALESCE(r.title,'Your catalogue') || ' has reached ' || to_char(a.milestone,'FM999,999,999,999') || ' lifetime streams.',
  '/achievements', jsonb_build_object('achievement_id',a.id,'milestone',a.milestone,'release_id',a.release_id,'restored_by_backfill',true)
FROM public.stream_achievements a
LEFT JOIN public.releases r ON r.id=a.release_id
LEFT JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_repair old WHERE old.id=a.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.achievement_email_deliveries (achievement_id,artist_id,recipient_email,status,attempt_count)
SELECT a.id,a.artist_id,ar.email,'pending',0
FROM public.stream_achievements a
JOIN public.artists ar ON ar.id=a.artist_id
WHERE NOT EXISTS (SELECT 1 FROM _achievement_ids_before_repair old WHERE old.id=a.id)
ON CONFLICT (achievement_id) DO NOTHING;
