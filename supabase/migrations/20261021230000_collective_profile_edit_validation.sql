-- Allow members to clear optional profile fields and validate profile/social URLs.
-- The RPC remains owner-scoped and cannot update membership status or professional roles.

CREATE OR REPLACE FUNCTION public.update_my_collective_profile(
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_social_links jsonb DEFAULT NULL,
  p_contribution_areas text[] DEFAULT NULL,
  p_visibility text DEFAULT NULL,
  p_discoverable boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_id uuid;
  v_row public.collective_members;
  v_link text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_id
  FROM public.collective_members
  WHERE user_id = auth.uid();

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Not a collective member';
  END IF;

  IF p_visibility IS NOT NULL AND p_visibility NOT IN ('public', 'members', 'private') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;

  IF p_avatar_url IS NOT NULL AND trim(p_avatar_url) <> ''
     AND trim(p_avatar_url) !~* '^https?://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'Profile photo URL must use HTTP or HTTPS';
  END IF;

  IF p_social_links IS NOT NULL THEN
    IF jsonb_typeof(p_social_links) <> 'object' THEN
      RAISE EXCEPTION 'Social links must be an object';
    END IF;
    FOR v_link IN SELECT value FROM jsonb_each_text(p_social_links)
    LOOP
      IF trim(v_link) <> '' AND trim(v_link) !~* '^https?://[^[:space:]]+$' THEN
        RAISE EXCEPTION 'Social links must use HTTP or HTTPS';
      END IF;
    END LOOP;
  END IF;

  UPDATE public.collective_members
  SET
    display_name = COALESCE(NULLIF(trim(p_display_name), ''), display_name),
    avatar_url = CASE WHEN p_avatar_url IS NULL THEN avatar_url ELSE NULLIF(trim(p_avatar_url), '') END,
    bio = CASE WHEN p_bio IS NULL THEN bio ELSE left(p_bio, 1000) END,
    country = CASE WHEN p_country IS NULL THEN country ELSE NULLIF(trim(p_country), '') END,
    city = CASE WHEN p_city IS NULL THEN city ELSE NULLIF(trim(p_city), '') END,
    social_links = COALESCE(p_social_links, social_links),
    contribution_areas = COALESCE(p_contribution_areas, contribution_areas),
    visibility = COALESCE(p_visibility, visibility),
    discoverable = COALESCE(p_discoverable, discoverable),
    updated_at = now()
  WHERE id = v_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id' - 'application_id';
END
$function$;

REVOKE ALL ON FUNCTION public.update_my_collective_profile(text, text, text, text, text, jsonb, text[], text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_collective_profile(text, text, text, text, text, jsonb, text[], text, boolean) TO authenticated;
