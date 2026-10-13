ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS cover_art_update_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.releases
  DROP CONSTRAINT IF EXISTS releases_cover_art_update_count_check;

ALTER TABLE public.releases
  ADD CONSTRAINT releases_cover_art_update_count_check
  CHECK (cover_art_update_count >= 0 AND cover_art_update_count <= 2);

CREATE OR REPLACE FUNCTION public.update_release_cover_art(
  p_release_id uuid,
  p_new_cover_art_url text
)
RETURNS TABLE(previous_cover_art_url text, new_cover_art_update_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_release public.releases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to update cover art.';
  END IF;

  IF p_new_cover_art_url IS NULL OR length(trim(p_new_cover_art_url)) = 0 THEN
    RAISE EXCEPTION 'A new cover artwork URL is required.';
  END IF;

  IF position('/release_artwork/' || auth.uid()::text || '/' || p_release_id::text || '/'
      IN p_new_cover_art_url) = 0 THEN
    RAISE EXCEPTION 'The uploaded artwork path is invalid for this release.';
  END IF;

  SELECT r.* INTO v_release
  FROM public.releases r
  WHERE r.id = p_release_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Release not found.';
  END IF;

  IF NOT public.user_is_admin()
     AND NOT public.has_account_access(v_release.artist_id, 'manager'::public.account_role) THEN
    RAISE EXCEPTION 'You do not have permission to update this release artwork.';
  END IF;

  IF v_release.cover_art_update_count >= 2 THEN
    RAISE EXCEPTION 'This release has used both allowed cover artwork updates.';
  END IF;

  UPDATE public.releases
  SET cover_art_url = p_new_cover_art_url,
      cover_art_update_count = cover_art_update_count + 1,
      updated_at = now()
  WHERE id = p_release_id;

  RETURN QUERY SELECT v_release.cover_art_url, v_release.cover_art_update_count + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.update_release_cover_art(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_release_cover_art(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Users can delete their release artwork" ON storage.objects;
CREATE POLICY "Users can delete their release artwork"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'release_artwork'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view their release artwork uploads" ON storage.objects;
CREATE POLICY "Users can view their release artwork uploads"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'release_artwork'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
