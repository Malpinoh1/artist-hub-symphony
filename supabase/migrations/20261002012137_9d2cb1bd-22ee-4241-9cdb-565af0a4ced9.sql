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
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_row public.collective_members;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_id FROM public.collective_members
  WHERE user_id = auth.uid() AND status = 'active';
  IF v_id IS NULL THEN RAISE EXCEPTION 'Active collective membership required'; END IF;
  IF p_visibility IS NOT NULL AND p_visibility NOT IN ('public','members','private') THEN
    RAISE EXCEPTION 'Invalid visibility';
  END IF;

  UPDATE public.collective_members SET
    display_name = COALESCE(NULLIF(trim(p_display_name), ''), display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    bio = COALESCE(left(p_bio, 1000), bio),
    country = COALESCE(NULLIF(trim(p_country), ''), country),
    city = COALESCE(NULLIF(trim(p_city), ''), city),
    social_links = COALESCE(p_social_links, social_links),
    contribution_areas = COALESCE(p_contribution_areas, contribution_areas),
    visibility = COALESCE(p_visibility, visibility),
    discoverable = COALESCE(p_discoverable, discoverable),
    updated_at = now()
  WHERE id = v_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row) - 'user_id' - 'application_id';
END $$;

REVOKE ALL ON FUNCTION public.update_my_collective_profile(text,text,text,text,text,jsonb,text[],text,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_my_collective_profile(text,text,text,text,text,jsonb,text[],text,boolean) TO authenticated;