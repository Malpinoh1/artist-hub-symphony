-- Public metadata for the latest Android APK; writes are restricted to full admins.
CREATE TABLE IF NOT EXISTS public.app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code integer NOT NULL UNIQUE CHECK (version_code > 0),
  version_name text NOT NULL CHECK (length(trim(version_name)) > 0),
  release_notes text NOT NULL DEFAULT '',
  apk_url text NOT NULL CHECK (apk_url LIKE 'https://%'),
  is_published boolean NOT NULL DEFAULT false,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS app_releases_published_version_idx
  ON public.app_releases (version_code DESC)
  WHERE is_published = true;

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published Android app releases" ON public.app_releases;
CREATE POLICY "Anyone can view published Android app releases"
  ON public.app_releases FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins manage Android app releases" ON public.app_releases;
CREATE POLICY "Admins manage Android app releases"
  ON public.app_releases FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()))
  WITH CHECK (public.user_is_admin(auth.uid()));

GRANT SELECT ON public.app_releases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_releases TO authenticated;

-- APKs are public to download, but only full admins can upload, replace, or delete them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-releases',
  'app-releases',
  true,
  209715200,
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 209715200,
  allowed_mime_types = ARRAY['application/vnd.android.package-archive', 'application/octet-stream'];

DROP POLICY IF EXISTS "Anyone can download published Android APK objects" ON storage.objects;
CREATE POLICY "Anyone can download published Android APK objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-releases');

DROP POLICY IF EXISTS "Admins upload Android APK objects" ON storage.objects;
CREATE POLICY "Admins upload Android APK objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'app-releases' AND public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update Android APK objects" ON storage.objects;
CREATE POLICY "Admins update Android APK objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'app-releases' AND public.user_is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'app-releases' AND public.user_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete Android APK objects" ON storage.objects;
CREATE POLICY "Admins delete Android APK objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'app-releases' AND public.user_is_admin(auth.uid()));
