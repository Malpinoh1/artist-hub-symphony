ALTER FUNCTION public.submit_release_from_draft(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.admin_delete_release(uuid) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.submit_release_from_draft(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_release(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_release_from_draft(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_release(uuid) TO authenticated, service_role;