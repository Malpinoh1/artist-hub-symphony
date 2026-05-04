
-- Make sensitive storage buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('release_artwork','audio_files');

-- Lock down privileged SECURITY DEFINER functions that should never be invoked directly via PostgREST
REVOKE ALL ON FUNCTION public.process_income(uuid, uuid, numeric, text, text, date, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_royalty_upload(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
