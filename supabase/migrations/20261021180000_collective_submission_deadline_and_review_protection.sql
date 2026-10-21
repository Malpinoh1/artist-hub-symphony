-- Enforce opportunity deadlines and protect reviewer-controlled submission fields.
-- Member edits must never be able to forge review notes, reviewer identity, or approval status.

DROP POLICY IF EXISTS "Members create own submissions" ON public.collective_submissions;
CREATE POLICY "Members create own submissions"
ON public.collective_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.collective_members m
    WHERE m.id = collective_submissions.member_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
  AND EXISTS (
    SELECT 1
    FROM public.collective_opportunities o
    WHERE o.id = collective_submissions.opportunity_id
      AND o.status = 'published'
      AND (o.deadline IS NULL OR o.deadline > now())
  )
);

DROP POLICY IF EXISTS "Members revise own pending submissions" ON public.collective_submissions;
CREATE POLICY "Members revise own pending submissions"
ON public.collective_submissions
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND status IN ('submitted', 'needs_changes')
  AND EXISTS (
    SELECT 1
    FROM public.collective_members m
    WHERE m.id = collective_submissions.member_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'submitted'
  AND EXISTS (
    SELECT 1
    FROM public.collective_members m
    WHERE m.id = collective_submissions.member_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
);

CREATE OR REPLACE FUNCTION public.protect_collective_submission_member_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  -- Service-role/admin workflows run without an end-user auth.uid() and are
  -- validated by the privileged Edge Function before updating review fields.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Members may only edit their own submissions';
  END IF;

  IF OLD.status NOT IN ('submitted', 'needs_changes') THEN
    RAISE EXCEPTION 'This submission can no longer be edited';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.opportunity_id IS DISTINCT FROM OLD.opportunity_id
     OR NEW.reviewer_notes IS DISTINCT FROM OLD.reviewer_notes
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'Members cannot change submission ownership or reviewer-controlled fields';
  END IF;

  IF NEW.status <> 'submitted' THEN
    RAISE EXCEPTION 'Member edits must return the submission to submitted status';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS protect_collective_submission_member_update
ON public.collective_submissions;
CREATE TRIGGER protect_collective_submission_member_update
BEFORE UPDATE ON public.collective_submissions
FOR EACH ROW
EXECUTE FUNCTION public.protect_collective_submission_member_update();


-- Links are optional, but any submitted link must use HTTP(S). NOT VALID
-- avoids blocking deployment if legacy records need cleanup while enforcing
-- the rule for new writes immediately.
DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'collective_submissions_link_http_check'
      AND conrelid = 'public.collective_submissions'::regclass
  ) THEN
    ALTER TABLE public.collective_submissions
      ADD CONSTRAINT collective_submissions_link_http_check
      CHECK (link IS NULL OR link ~* '^https?://[^[:space:]]+$') NOT VALID;
  END IF;
END
$constraint$;
