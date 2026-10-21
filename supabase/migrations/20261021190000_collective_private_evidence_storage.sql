-- Private evidence storage for MDISTRO Collective member submissions.
-- Do not reuse public release-artwork buckets for confidential contribution evidence.

ALTER TABLE public.collective_submissions
  ADD COLUMN IF NOT EXISTS evidence_path text;

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
