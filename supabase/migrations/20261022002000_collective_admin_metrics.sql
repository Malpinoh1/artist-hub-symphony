-- Expand the admin summary with actual counts from the completed Collective workflows.
CREATE OR REPLACE FUNCTION public.get_collective_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  RETURN jsonb_build_object(
    'pending', (SELECT count(*) FROM public.collective_applications WHERE status = 'pending'),
    'under_review', (SELECT count(*) FROM public.collective_applications WHERE status = 'under_review'),
    'needs_information', (SELECT count(*) FROM public.collective_applications WHERE status = 'needs_information'),
    'approved', (SELECT count(*) FROM public.collective_applications WHERE status = 'approved'),
    'rejected', (SELECT count(*) FROM public.collective_applications WHERE status = 'rejected'),
    'members_active', (SELECT count(*) FROM public.collective_members WHERE status = 'active'),
    'referrals_total', (SELECT count(*) FROM public.collective_referrals WHERE flagged = false),
    'referrals_qualified', (SELECT count(*) FROM public.collective_referrals WHERE flagged = false AND status IN ('qualified','active')),
    'referrals_active', (SELECT count(*) FROM public.collective_referrals WHERE flagged = false AND status = 'active'),
    'referrals_flagged', (SELECT count(*) FROM public.collective_referrals WHERE flagged = true),
    'opportunities_published', (SELECT count(*) FROM public.collective_opportunities WHERE status = 'published' AND (deadline IS NULL OR deadline > now())),
    'opportunity_applications_pending', (SELECT count(*) FROM public.collective_opportunity_applications WHERE status IN ('submitted','under_review')),
    'contributions_pending', (SELECT count(*) FROM public.collective_submissions WHERE status IN ('submitted','under_review','needs_changes')),
    'contributions_approved', (SELECT count(*) FROM public.collective_submissions WHERE status = 'accepted'),
    'announcements_published', (SELECT count(*) FROM public.collective_announcements WHERE status = 'published'),
    'email_deliveries_failed', (SELECT count(*) FROM public.collective_notification_deliveries WHERE status = 'failed')
  );
END
$function$;

REVOKE ALL ON FUNCTION public.get_collective_admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_collective_admin_stats() TO authenticated, service_role;
