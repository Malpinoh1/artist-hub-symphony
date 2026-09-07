
-- ============ Phase 2: member profile fields on existing members table ============
ALTER TABLE public.collective_members
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contribution_areas text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'members',
  ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT true;

ALTER TABLE public.collective_members
  DROP CONSTRAINT IF EXISTS collective_members_visibility_check;
ALTER TABLE public.collective_members
  ADD CONSTRAINT collective_members_visibility_check
  CHECK (visibility IN ('public','members','private'));

CREATE INDEX IF NOT EXISTS idx_collective_members_roles ON public.collective_members USING gin (roles);
CREATE INDEX IF NOT EXISTS idx_collective_members_areas ON public.collective_members USING gin (contribution_areas);
CREATE INDEX IF NOT EXISTS idx_collective_members_country ON public.collective_members (country);

-- Helper: is the current user an active collective member?
CREATE OR REPLACE FUNCTION public.is_active_collective_member(uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collective_members
    WHERE user_id = uid AND status = 'active'
  );
$$;

-- ============ Opportunities ============
CREATE TABLE IF NOT EXISTS public.collective_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  requirements text,
  instructions text,
  requires_submission boolean NOT NULL DEFAULT true,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collective_opportunities_status_check
    CHECK (status IN ('draft','published','closed','archived'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collective_opportunities TO authenticated;
GRANT ALL ON public.collective_opportunities TO service_role;
ALTER TABLE public.collective_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view open opportunities" ON public.collective_opportunities
  FOR SELECT TO authenticated
  USING (status IN ('published','closed') AND public.is_active_collective_member());

CREATE POLICY "Staff manage opportunities" ON public.collective_opportunities
  FOR ALL TO authenticated
  USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());

CREATE INDEX IF NOT EXISTS idx_collective_opps_status ON public.collective_opportunities (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collective_opps_category ON public.collective_opportunities (category);

CREATE TRIGGER trg_collective_opps_updated BEFORE UPDATE ON public.collective_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Submissions ============
CREATE TABLE IF NOT EXISTS public.collective_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.collective_opportunities(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.collective_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  submission_text text NOT NULL,
  link text,
  reference_note text,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_at timestamptz,
  reviewed_by uuid,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collective_submissions_status_check
    CHECK (status IN ('submitted','under_review','accepted','declined','needs_changes')),
  CONSTRAINT collective_submissions_unique UNIQUE (opportunity_id, member_id)
);

GRANT SELECT, INSERT, UPDATE ON public.collective_submissions TO authenticated;
GRANT ALL ON public.collective_submissions TO service_role;
ALTER TABLE public.collective_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own submissions" ON public.collective_submissions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members create own submissions" ON public.collective_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.collective_members m
      WHERE m.id = member_id AND m.user_id = auth.uid() AND m.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.collective_opportunities o
      WHERE o.id = opportunity_id AND o.status = 'published'
    )
  );

CREATE POLICY "Members revise own pending submissions" ON public.collective_submissions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('submitted','needs_changes'))
  WITH CHECK (user_id = auth.uid() AND status IN ('submitted','needs_changes'));

CREATE POLICY "Staff manage submissions" ON public.collective_submissions
  FOR ALL TO authenticated
  USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());

CREATE INDEX IF NOT EXISTS idx_collective_subs_user ON public.collective_submissions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collective_subs_opp ON public.collective_submissions (opportunity_id, status);

CREATE TRIGGER trg_collective_subs_updated BEFORE UPDATE ON public.collective_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Announcements ============
CREATE TABLE IF NOT EXISTS public.collective_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'update',
  featured_image_url text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collective_announcements_status_check
    CHECK (status IN ('draft','published','archived'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collective_announcements TO authenticated;
GRANT ALL ON public.collective_announcements TO service_role;
ALTER TABLE public.collective_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view published announcements" ON public.collective_announcements
  FOR SELECT TO authenticated
  USING (status = 'published' AND public.is_active_collective_member());

CREATE POLICY "Staff manage announcements" ON public.collective_announcements
  FOR ALL TO authenticated
  USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());

CREATE INDEX IF NOT EXISTS idx_collective_ann_status ON public.collective_announcements (status, published_at DESC);

CREATE TRIGGER trg_collective_ann_updated BEFORE UPDATE ON public.collective_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Profile update RPC (column-scoped, own row only) ============
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
  SELECT id INTO v_id FROM public.collective_members WHERE user_id = auth.uid();
  IF v_id IS NULL THEN RAISE EXCEPTION 'Not a collective member'; END IF;
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

-- ============ Public member profile (extended, privacy aware) ============
CREATE OR REPLACE FUNCTION public.get_collective_public_profile(p_handle text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_m public.collective_members; v_viewer_member boolean;
BEGIN
  SELECT * INTO v_m FROM public.collective_members
  WHERE handle = lower(trim(p_handle)) AND status = 'active';
  IF v_m.id IS NULL THEN RETURN NULL; END IF;

  v_viewer_member := public.is_active_collective_member();

  IF v_m.visibility = 'private' AND v_m.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN jsonb_build_object('handle', v_m.handle, 'display_name', v_m.display_name, 'private', true);
  END IF;

  IF v_m.visibility = 'members' AND NOT v_viewer_member
     AND v_m.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RETURN jsonb_build_object('handle', v_m.handle, 'display_name', v_m.display_name, 'members_only', true);
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
END $$;

-- ============ Directory ============
CREATE OR REPLACE FUNCTION public.list_collective_directory(
  p_search text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_area text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_member boolean; v_rows jsonb; v_total bigint; v_lim int;
BEGIN
  v_is_member := public.is_active_collective_member();
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 24), 1), 48);

  WITH base AS (
    SELECT m.* FROM public.collective_members m
    WHERE m.status = 'active' AND m.discoverable = true
      AND (m.visibility = 'public' OR (m.visibility = 'members' AND v_is_member))
      AND (p_role IS NULL OR p_role = ANY(m.roles))
      AND (p_country IS NULL OR lower(m.country) = lower(p_country))
      AND (p_area IS NULL OR p_area = ANY(m.contribution_areas))
      AND (
        p_search IS NULL OR p_search = '' OR
        m.display_name ILIKE '%' || p_search || '%' OR
        m.handle ILIKE '%' || p_search || '%' OR
        COALESCE(m.city,'') ILIKE '%' || p_search || '%'
      )
  )
  SELECT
    (SELECT count(*) FROM base),
    COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT handle, display_name, avatar_url, roles, country, city,
               contribution_areas, left(COALESCE(bio,''), 180) AS bio
        FROM base
        ORDER BY member_since DESC
        LIMIT v_lim OFFSET GREATEST(COALESCE(p_offset,0), 0)
      ) t
    ), '[]'::jsonb)
  INTO v_total, v_rows;

  RETURN jsonb_build_object('total', v_total, 'members', v_rows);
END $$;

-- ============ Referral activity (anonymised) ============
CREATE OR REPLACE FUNCTION public.get_my_referral_activity()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_member uuid; v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_member FROM public.collective_members WHERE user_id = auth.uid();
  IF v_member IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT r.status::text AS status, r.source, r.created_at, r.qualified_at,
           'Invited person #' || row_number() OVER (ORDER BY r.created_at) AS label
    FROM public.collective_referrals r
    WHERE r.referrer_member_id = v_member AND r.flagged = false
    ORDER BY r.created_at DESC
    LIMIT 100
  ) t;

  RETURN v_rows;
END $$;
