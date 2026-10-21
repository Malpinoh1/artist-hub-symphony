-- Restore the intended Collective profile discoverability rule in the live RPC.
-- Also remove anonymous execution of the admin-only aggregate RPC.
-- This migration deliberately does not alter membership or referral records.

CREATE OR REPLACE FUNCTION public.get_collective_public_profile(p_handle text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_m public.collective_members;
  v_viewer_member boolean;
  v_viewer_id uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  SELECT * INTO v_m
  FROM public.collective_members
  WHERE handle = lower(trim(p_handle))
    AND status = 'active';

  IF v_m.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_viewer_member := public.is_active_collective_member();

  -- Discoverability is an independent privacy control and must be enforced
  -- by the server-side RPC, not just by the directory query or page UI.
  IF NOT v_m.discoverable AND v_m.user_id <> v_viewer_id THEN
    RETURN jsonb_build_object(
      'handle', v_m.handle,
      'display_name', v_m.display_name,
      'hidden', true
    );
  END IF;

  IF v_m.visibility = 'private' AND v_m.user_id <> v_viewer_id THEN
    RETURN jsonb_build_object(
      'handle', v_m.handle,
      'display_name', v_m.display_name,
      'private', true
    );
  END IF;

  IF v_m.visibility = 'members'
     AND NOT v_viewer_member
     AND v_m.user_id <> v_viewer_id THEN
    RETURN jsonb_build_object(
      'handle', v_m.handle,
      'display_name', v_m.display_name,
      'members_only', true
    );
  END IF;

  RETURN jsonb_build_object(
    'handle', v_m.handle,
    'display_name', v_m.display_name,
    'avatar_url', v_m.avatar_url,
    'bio', v_m.bio,
    'roles', v_m.roles,
    'country', v_m.country,
    'city', v_m.city,
    'contribution_areas', v_m.contribution_areas,
    'social_links', v_m.social_links,
    'member_since', v_m.member_since
  );
END
$function$;

REVOKE ALL ON FUNCTION public.get_collective_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_collective_public_profile(text) TO anon, authenticated, service_role;

-- The function itself checks user_is_admin(), but anonymous callers should not
-- be able to invoke an admin-only statistics RPC at all.
REVOKE ALL ON FUNCTION public.get_collective_admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_collective_admin_stats() TO authenticated, service_role;
