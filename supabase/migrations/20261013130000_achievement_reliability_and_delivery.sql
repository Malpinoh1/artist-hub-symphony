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

-- Idempotent all-catalogue backfill using the same authoritative milestone RPC.
-- ON CONFLICT in that function preserves valid pre-existing achievements.
SELECT public.award_stream_achievements();
