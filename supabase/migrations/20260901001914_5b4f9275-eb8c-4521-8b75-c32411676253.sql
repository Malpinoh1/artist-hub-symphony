-- ============ ENUMS ============
CREATE TYPE public.collective_application_status AS ENUM ('pending','under_review','approved','rejected','needs_information');
CREATE TYPE public.collective_member_status AS ENUM ('active','suspended','inactive');
CREATE TYPE public.collective_referral_status AS ENUM ('registered','verified','qualified','active');

-- ============ ROLES CATALOG ============
CREATE TABLE public.collective_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collective_roles TO anon;
GRANT SELECT ON public.collective_roles TO authenticated;
GRANT ALL ON public.collective_roles TO service_role;
ALTER TABLE public.collective_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active collective roles" ON public.collective_roles
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage collective roles" ON public.collective_roles
  FOR ALL TO authenticated USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());
CREATE TRIGGER trg_collective_roles_updated BEFORE UPDATE ON public.collective_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.collective_roles (slug, label, sort_order) VALUES
  ('artist','Artist',10),
  ('fan','Fan / Music Supporter',20),
  ('dj','DJ',30),
  ('producer','Producer',40),
  ('songwriter','Songwriter',50),
  ('vocalist','Vocalist',60),
  ('artist_manager','Artist Manager',70),
  ('label_manager','Label Manager',80),
  ('a_and_r','A&R',90),
  ('music_executive','Music Executive',100),
  ('label_rep','Record Label Representative',110),
  ('promoter','Music Promoter',120),
  ('blogger','Music Blogger',130),
  ('journalist','Music Journalist',140),
  ('radio','Radio Personality',150),
  ('content_creator','Content Creator',160),
  ('photographer','Photographer',170),
  ('videographer','Videographer',180),
  ('event_organizer','Event Organizer',190),
  ('tour_promoter','Concert / Tour Promoter',200),
  ('industry_pro','Music Industry Professional',210),
  ('community_organizer','Music Community Organizer',220),
  ('student','Music Student',230),
  ('other','Other',999);

-- ============ APPLICATIONS ============
CREATE TABLE public.collective_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  email_normalized text GENERATED ALWAYS AS (lower(trim(email))) STORED,
  phone text,
  country text NOT NULL,
  city text,
  roles text[] NOT NULL DEFAULT '{}',
  other_role text,
  social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_join text NOT NULL,
  contribution text NOT NULL,
  status public.collective_application_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  referral_code text,
  submitted_ip text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collective_apps_user ON public.collective_applications(user_id);
CREATE INDEX idx_collective_apps_status ON public.collective_applications(status);
CREATE INDEX idx_collective_apps_created ON public.collective_applications(created_at DESC);
-- one active (non-rejected) application per email
CREATE UNIQUE INDEX idx_collective_apps_active_email ON public.collective_applications(email_normalized)
  WHERE status <> 'rejected';

GRANT SELECT ON public.collective_applications TO authenticated;
GRANT UPDATE ON public.collective_applications TO authenticated;
GRANT ALL ON public.collective_applications TO service_role;
ALTER TABLE public.collective_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants view own application" ON public.collective_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR email_normalized = lower(trim(COALESCE(auth.jwt() ->> 'email', ''))));
CREATE POLICY "Admins view all applications" ON public.collective_applications
  FOR SELECT TO authenticated USING (public.user_is_admin());
CREATE POLICY "Admins update applications" ON public.collective_applications
  FOR UPDATE TO authenticated USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());
CREATE TRIGGER trg_collective_apps_updated BEFORE UPDATE ON public.collective_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MEMBERS ============
CREATE TABLE public.collective_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.collective_applications(id) ON DELETE SET NULL,
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  roles text[] NOT NULL DEFAULT '{}',
  status public.collective_member_status NOT NULL DEFAULT 'active',
  member_since timestamptz NOT NULL DEFAULT now(),
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collective_members_status ON public.collective_members(status);
GRANT SELECT ON public.collective_members TO authenticated;
GRANT ALL ON public.collective_members TO service_role;
ALTER TABLE public.collective_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own membership" ON public.collective_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage memberships" ON public.collective_members
  FOR ALL TO authenticated USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());
CREATE TRIGGER trg_collective_members_updated BEFORE UPDATE ON public.collective_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REFERRALS ============
CREATE TABLE public.collective_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_member_id uuid NOT NULL REFERENCES public.collective_members(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email_normalized text NOT NULL,
  referred_application_id uuid REFERENCES public.collective_applications(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'collective_link',
  status public.collective_referral_status NOT NULL DEFAULT 'registered',
  qualified_at timestamptz,
  flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_collective_referrals_unique ON public.collective_referrals(referred_email_normalized);
CREATE INDEX idx_collective_referrals_referrer ON public.collective_referrals(referrer_member_id);
CREATE INDEX idx_collective_referrals_status ON public.collective_referrals(status);
GRANT SELECT ON public.collective_referrals TO authenticated;
GRANT ALL ON public.collective_referrals TO service_role;
ALTER TABLE public.collective_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage referrals" ON public.collective_referrals
  FOR ALL TO authenticated USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());
CREATE TRIGGER trg_collective_referrals_updated BEFORE UPDATE ON public.collective_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EMAIL EVENT LOG ============
CREATE TABLE public.collective_email_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  recipient text NOT NULL,
  application_id uuid REFERENCES public.collective_applications(id) ON DELETE SET NULL,
  member_id uuid REFERENCES public.collective_members(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collective_email_events_created ON public.collective_email_events(created_at DESC);
GRANT SELECT ON public.collective_email_events TO authenticated;
GRANT ALL ON public.collective_email_events TO service_role;
ALTER TABLE public.collective_email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view collective email events" ON public.collective_email_events
  FOR SELECT TO authenticated USING (public.user_is_admin());

-- ============ SECURITY DEFINER HELPERS ============
-- Public, privacy-safe lookup of a collective link
CREATE OR REPLACE FUNCTION public.get_collective_public_profile(p_handle text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'handle', m.handle,
    'display_name', m.display_name,
    'roles', m.roles,
    'member_since', m.member_since
  )
  FROM public.collective_members m
  WHERE m.handle = lower(trim(p_handle)) AND m.status = 'active';
$$;
GRANT EXECUTE ON FUNCTION public.get_collective_public_profile(text) TO anon, authenticated;

-- Member's own dashboard summary (aggregates only, no private referred-user data)
CREATE OR REPLACE FUNCTION public.get_my_collective_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_m public.collective_members; v_app public.collective_applications; v_res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_m FROM public.collective_members WHERE user_id = auth.uid();
  SELECT * INTO v_app FROM public.collective_applications
    WHERE user_id = auth.uid()
       OR email_normalized = lower(trim(COALESCE(auth.jwt() ->> 'email','')))
    ORDER BY created_at DESC LIMIT 1;

  v_res := jsonb_build_object(
    'application', CASE WHEN v_app.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', v_app.id, 'status', v_app.status, 'roles', v_app.roles,
        'other_role', v_app.other_role, 'admin_notes', v_app.admin_notes,
        'created_at', v_app.created_at, 'reviewed_at', v_app.reviewed_at) END,
    'member', CASE WHEN v_m.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', v_m.id, 'handle', v_m.handle, 'display_name', v_m.display_name,
        'roles', v_m.roles, 'status', v_m.status,
        'member_since', v_m.member_since, 'points', v_m.points) END
  );

  IF v_m.id IS NOT NULL THEN
    v_res := v_res || jsonb_build_object('referrals', (
      SELECT jsonb_build_object(
        'total', count(*),
        'registered', count(*) FILTER (WHERE status = 'registered'),
        'verified', count(*) FILTER (WHERE status = 'verified'),
        'qualified', count(*) FILTER (WHERE status IN ('qualified','active')),
        'active', count(*) FILTER (WHERE status = 'active')
      ) FROM public.collective_referrals
      WHERE referrer_member_id = v_m.id AND flagged = false
    ));
  ELSE
    v_res := v_res || jsonb_build_object('referrals',
      jsonb_build_object('total',0,'registered',0,'verified',0,'qualified',0,'active',0));
  END IF;

  RETURN v_res;
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_collective_summary() TO authenticated;

-- Admin statistics
CREATE OR REPLACE FUNCTION public.get_collective_admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.user_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN jsonb_build_object(
    'pending', (SELECT count(*) FROM public.collective_applications WHERE status = 'pending'),
    'under_review', (SELECT count(*) FROM public.collective_applications WHERE status = 'under_review'),
    'needs_information', (SELECT count(*) FROM public.collective_applications WHERE status = 'needs_information'),
    'approved', (SELECT count(*) FROM public.collective_applications WHERE status = 'approved'),
    'rejected', (SELECT count(*) FROM public.collective_applications WHERE status = 'rejected'),
    'members_active', (SELECT count(*) FROM public.collective_members WHERE status = 'active'),
    'referrals_total', (SELECT count(*) FROM public.collective_referrals WHERE flagged = false),
    'referrals_qualified', (SELECT count(*) FROM public.collective_referrals WHERE flagged = false AND status IN ('qualified','active')),
    'referrals_active', (SELECT count(*) FROM public.collective_referrals WHERE flagged = false AND status = 'active')
  );
END $$;
GRANT EXECUTE ON FUNCTION public.get_collective_admin_stats() TO authenticated;