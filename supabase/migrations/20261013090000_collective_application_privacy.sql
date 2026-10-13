-- Keep applicant-facing review guidance separate from internal reviewer notes.
ALTER TABLE public.collective_applications
  ADD COLUMN IF NOT EXISTS applicant_message text;

-- Do not expose internal notes or submitted IPs through direct authenticated table reads.
-- Applicant and admin interfaces must select only explicitly granted columns.
REVOKE SELECT ON TABLE public.collective_applications FROM authenticated;
GRANT SELECT (
  id, user_id, full_name, email, email_normalized, phone, country, city,
  roles, other_role, social_links, why_join, contribution, status,
  referral_code, reviewed_at, reviewed_by, created_at, updated_at, applicant_message
) ON TABLE public.collective_applications TO authenticated;

-- Summary RPC exposes only the applicant-facing message, never internal admin notes.
CREATE OR REPLACE FUNCTION public.get_my_collective_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_m public.collective_members;
  v_app public.collective_applications;
  v_res jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_m
  FROM public.collective_members
  WHERE user_id = auth.uid();

  SELECT * INTO v_app
  FROM public.collective_applications
  WHERE user_id = auth.uid()
     OR email_normalized = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
  ORDER BY created_at DESC
  LIMIT 1;

  v_res := jsonb_build_object(
    'application',
    CASE WHEN v_app.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_app.id,
      'status', v_app.status,
      'roles', v_app.roles,
      'other_role', v_app.other_role,
      'applicant_message', v_app.applicant_message,
      'created_at', v_app.created_at,
      'reviewed_at', v_app.reviewed_at
    ) END,
    'member',
    CASE WHEN v_m.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_m.id,
      'handle', v_m.handle,
      'display_name', v_m.display_name,
      'roles', v_m.roles,
      'status', v_m.status,
      'member_since', v_m.member_since,
      'points', v_m.points
    ) END
  );

  IF v_m.id IS NOT NULL THEN
    v_res := v_res || jsonb_build_object('referrals', (
      SELECT jsonb_build_object(
        'total', count(*),
        'registered', count(*) FILTER (WHERE status = 'registered'),
        'verified', count(*) FILTER (WHERE status = 'verified'),
        'qualified', count(*) FILTER (WHERE status IN ('qualified','active')),
        'active', count(*) FILTER (WHERE status = 'active')
      )
      FROM public.collective_referrals
      WHERE referrer_member_id = v_m.id AND flagged = false
    ));
  ELSE
    v_res := v_res || jsonb_build_object(
      'referrals',
      jsonb_build_object('total',0,'registered',0,'verified',0,'qualified',0,'active',0)
    );
  END IF;

  RETURN v_res;
END
$function$;

REVOKE ALL ON FUNCTION public.get_my_collective_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_collective_summary() TO authenticated;
