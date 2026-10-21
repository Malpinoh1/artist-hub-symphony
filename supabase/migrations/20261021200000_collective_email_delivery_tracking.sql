-- Idempotent delivery records for Collective broadcast email.
-- This table is service-role-only; it contains recipient email addresses and delivery state.

CREATE TABLE IF NOT EXISTS public.collective_notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.collective_members(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('announcement', 'opportunity_new', 'contribution_accepted', 'contribution_declined', 'contribution_needs_changes')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT collective_notification_deliveries_event_user_key UNIQUE (event_key, user_id)
);

-- Database uniqueness closes the race between concurrent broadcast retries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_collective_announcement_notification_once
  ON public.notifications (user_id, (metadata ->> 'announcement_id'))
  WHERE type = 'collective_announcement' AND metadata ? 'announcement_id';

CREATE UNIQUE INDEX IF NOT EXISTS idx_collective_opportunity_notification_once
  ON public.notifications (user_id, (metadata ->> 'opportunity_id'))
  WHERE type = 'collective_opportunity' AND metadata ? 'opportunity_id';

CREATE UNIQUE INDEX IF NOT EXISTS idx_collective_contribution_notification_once
  ON public.notifications (user_id, (metadata ->> 'submission_id'), (metadata ->> 'reviewed_at'))
  WHERE type = 'collective_contribution'
    AND metadata ? 'submission_id'
    AND metadata ? 'reviewed_at';

CREATE INDEX IF NOT EXISTS idx_collective_notification_deliveries_status
  ON public.collective_notification_deliveries (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_collective_notification_deliveries_event
  ON public.collective_notification_deliveries (event_key, status);

ALTER TABLE public.collective_notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.collective_notification_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.collective_notification_deliveries TO service_role;
