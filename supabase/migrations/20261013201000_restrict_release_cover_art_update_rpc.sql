REVOKE EXECUTE ON FUNCTION public.update_release_cover_art(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_release_cover_art(uuid, text) TO authenticated;
