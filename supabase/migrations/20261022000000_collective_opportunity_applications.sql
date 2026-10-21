-- Separate opportunity interest/application records from contribution evidence.
CREATE TABLE IF NOT EXISTS public.collective_opportunity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.collective_opportunities(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.collective_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'accepted', 'declined', 'withdrawn')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collective_opportunity_applications_unique_member UNIQUE (opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collective_opportunity_applications_member
  ON public.collective_opportunity_applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collective_opportunity_applications_opportunity
  ON public.collective_opportunity_applications (opportunity_id, status, created_at DESC);

ALTER TABLE public.collective_opportunity_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.collective_opportunity_applications FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.collective_opportunity_applications TO authenticated;
GRANT ALL ON TABLE public.collective_opportunity_applications TO service_role;

DROP POLICY IF EXISTS "Members view own opportunity applications" ON public.collective_opportunity_applications;
CREATE POLICY "Members view own opportunity applications"
ON public.collective_opportunity_applications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members apply to published opportunities" ON public.collective_opportunity_applications;
CREATE POLICY "Members apply to published opportunities"
ON public.collective_opportunity_applications
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.collective_members m
    WHERE m.id = member_id AND m.user_id = auth.uid() AND m.status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.collective_opportunities o
    WHERE o.id = opportunity_id
      AND o.status = 'published'
      AND (o.deadline IS NULL OR o.deadline > now())
  )
);

DROP POLICY IF EXISTS "Members withdraw or reapply to own opportunity applications" ON public.collective_opportunity_applications;
CREATE POLICY "Members withdraw or reapply to own opportunity applications"
ON public.collective_opportunity_applications
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND status IN ('submitted', 'withdrawn')
)
WITH CHECK (
  user_id = auth.uid()
  AND status IN ('submitted', 'withdrawn')
);

DROP POLICY IF EXISTS "Staff manage opportunity applications" ON public.collective_opportunity_applications;
CREATE POLICY "Staff manage opportunity applications"
ON public.collective_opportunity_applications
FOR ALL TO authenticated
USING (public.user_is_admin(auth.uid()))
WITH CHECK (public.user_is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_collective_opportunity_application_member_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.user_is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Members may only edit their own opportunity applications';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes THEN
    RAISE EXCEPTION 'Members cannot change application ownership or review fields';
  END IF;

  IF NOT (
    (OLD.status = 'submitted' AND NEW.status = 'withdrawn')
    OR (OLD.status = 'withdrawn' AND NEW.status = 'submitted')
  ) THEN
    RAISE EXCEPTION 'Only submitted applications can be withdrawn and withdrawn applications can be resubmitted';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS protect_collective_opportunity_application_member_update
ON public.collective_opportunity_applications;
CREATE TRIGGER protect_collective_opportunity_application_member_update
BEFORE UPDATE ON public.collective_opportunity_applications
FOR EACH ROW EXECUTE FUNCTION public.protect_collective_opportunity_application_member_update();

REVOKE ALL ON FUNCTION public.protect_collective_opportunity_application_member_update() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_collective_opportunity_application(
  p_application_id uuid,
  p_status text,
  p_reviewer_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_app public.collective_opportunity_applications;
  v_notes text := left(trim(COALESCE(p_reviewer_notes, '')), 2000);
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF p_status NOT IN ('under_review', 'accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid application review status';
  END IF;

  SELECT * INTO v_app
  FROM public.collective_opportunity_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF v_app.id IS NULL THEN
    RAISE EXCEPTION 'Opportunity application not found';
  END IF;

  IF v_app.status = p_status THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true, 'status', p_status);
  END IF;

  IF NOT (
    (v_app.status = 'submitted' AND p_status IN ('under_review', 'accepted', 'declined'))
    OR (v_app.status = 'under_review' AND p_status IN ('accepted', 'declined'))
  ) THEN
    RAISE EXCEPTION 'This application has already been reviewed';
  END IF;

  UPDATE public.collective_opportunity_applications
  SET status = p_status,
      reviewer_notes = v_notes,
      reviewed_at = v_now,
      reviewed_by = auth.uid(),
      updated_at = v_now
  WHERE id = p_application_id;

  INSERT INTO public.collective_audit_logs (
    actor_id, action, target_table, target_id, old_state, new_state
  ) VALUES (
    auth.uid(),
    'opportunity_application_review',
    'collective_opportunity_applications',
    p_application_id,
    jsonb_build_object('status', v_app.status),
    jsonb_build_object('status', p_status, 'reviewed_at', v_now)
  );

  INSERT INTO public.notifications (user_id, type, title, message, link, metadata)
  VALUES (
    v_app.user_id,
    'collective_opportunity_application',
    CASE p_status
      WHEN 'accepted' THEN 'Opportunity application accepted'
      WHEN 'declined' THEN 'Opportunity application not accepted'
      ELSE 'Opportunity application under review'
    END,
    CASE WHEN v_notes = '' THEN 'Your opportunity application status has been updated.'
         ELSE v_notes END,
    '/collective/center',
    jsonb_build_object('application_id', p_application_id, 'status', p_status, 'reviewed_at', v_now)
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'status', p_status);
END
$function$;

REVOKE ALL ON FUNCTION public.review_collective_opportunity_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_collective_opportunity_application(uuid, text, text) TO authenticated, service_role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_collective_opportunity_application_notification_once
  ON public.notifications (user_id, (metadata ->> 'application_id'), (metadata ->> 'reviewed_at'))
  WHERE type = 'collective_opportunity_application'
    AND metadata ? 'application_id'
    AND metadata ? 'reviewed_at';
