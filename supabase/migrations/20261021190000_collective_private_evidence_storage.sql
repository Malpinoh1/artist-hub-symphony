-- Private evidence storage for MDISTRO Collective member submissions.
-- Do not reuse public release-artwork buckets for confidential contribution evidence.

ALTER TABLE public.collective_submissions
  ADD COLUMN IF NOT EXISTS evidence_path text;

-- A submission may only reference an evidence object in its owner's folder.
DROP POLICY IF EXISTS "Members create own submissions" ON public.collective_submissions;
CREATE POLICY "Members create own submissions"
ON public.collective_submissions
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (evidence_path IS NULL OR split_part(evidence_path, '/', 1) = auth.uid()::text)
  AND EXISTS (
    SELECT 1 FROM public.collective_members m
    WHERE m.id = collective_submissions.member_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.collective_opportunities o
    WHERE o.id = collective_submissions.opportunity_id
      AND o.status = 'published'
      AND (o.deadline IS NULL OR o.deadline > now())
  )
);

DROP POLICY IF EXISTS "Members revise own pending submissions" ON public.collective_submissions;
CREATE POLICY "Members revise own pending submissions"
ON public.collective_submissions
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND status IN ('submitted', 'needs_changes')
  AND EXISTS (
    SELECT 1 FROM public.collective_members m
    WHERE m.id = collective_submissions.member_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'submitted'
  AND (evidence_path IS NULL OR split_part(evidence_path, '/', 1) = auth.uid()::text)
  AND EXISTS (
    SELECT 1 FROM public.collective_members m
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

  IF NEW.evidence_path IS NOT NULL
     AND split_part(NEW.evidence_path, '/', 1) <> auth.uid()::text THEN
    RAISE EXCEPTION 'Members may only attach evidence from their own storage folder';
  END IF;

  IF NEW.status <> 'submitted' THEN
    RAISE EXCEPTION 'Member edits must return the submission to submitted status';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collective-evidence',
  'collective-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[];

DROP POLICY IF EXISTS "Collective members upload own evidence" ON storage.objects;
CREATE POLICY "Collective members upload own evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'collective-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
  AND lower(COALESCE(metadata ->> 'mimetype', '')) IN (
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
  )
);

DROP POLICY IF EXISTS "Collective members and staff view evidence" ON storage.objects;
CREATE POLICY "Collective members and staff view evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'collective-evidence'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.user_is_admin()
  )
);

DROP POLICY IF EXISTS "Collective members delete own evidence" ON storage.objects;
CREATE POLICY "Collective members delete own evidence"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'collective-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
);

DROP POLICY IF EXISTS "Collective members update own evidence" ON storage.objects;
CREATE POLICY "Collective members update own evidence"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'collective-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
)
WITH CHECK (
  bucket_id = 'collective-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
);
