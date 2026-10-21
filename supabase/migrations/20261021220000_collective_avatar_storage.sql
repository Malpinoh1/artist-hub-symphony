-- Public member avatars are intentionally public; uploads remain owner-scoped.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collective-avatars',
  'collective-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DO $bucket_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'collective-avatars'
      AND public = true
      AND file_size_limit = 5242880
      AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
  ) THEN
    RAISE EXCEPTION 'collective-avatars bucket already exists with unexpected privacy or upload settings; inspect it before continuing';
  END IF;
END
$bucket_check$;

DROP POLICY IF EXISTS "Collective members upload own avatar" ON storage.objects;
CREATE POLICY "Collective members upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'collective-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
  AND lower(COALESCE(metadata ->> 'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
);

DROP POLICY IF EXISTS "Collective members update own avatar" ON storage.objects;
CREATE POLICY "Collective members update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'collective-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
)
WITH CHECK (
  bucket_id = 'collective-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
  AND lower(COALESCE(metadata ->> 'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
);

DROP POLICY IF EXISTS "Collective members delete own avatar" ON storage.objects;
CREATE POLICY "Collective members delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'collective-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_active_collective_member()
);
