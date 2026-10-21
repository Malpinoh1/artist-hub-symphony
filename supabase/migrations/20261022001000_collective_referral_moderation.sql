-- Controlled referral abuse flags. Attribution itself is not changed by this operation.
CREATE OR REPLACE FUNCTION public.manage_collective_referral_flag(
  p_referral_id uuid,
  p_flagged boolean,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_referral public.collective_referrals;
  v_reason text := left(trim(COALESCE(p_reason, '')), 1000);
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  IF length(v_reason) < 10 THEN
    RAISE EXCEPTION 'Please provide a reason of at least 10 characters';
  END IF;

  SELECT * INTO v_referral
  FROM public.collective_referrals
  WHERE id = p_referral_id
  FOR UPDATE;
  IF v_referral.id IS NULL THEN
    RAISE EXCEPTION 'Referral record not found';
  END IF;

  UPDATE public.collective_referrals
  SET flagged = p_flagged,
      flag_reason = CASE WHEN p_flagged THEN v_reason ELSE NULL END,
      updated_at = now()
  WHERE id = p_referral_id;

  INSERT INTO public.collective_audit_logs (
    actor_id, action, target_table, target_id, old_state, new_state, reason
  ) VALUES (
    auth.uid(),
    CASE WHEN p_flagged THEN 'referral_flagged' ELSE 'referral_unflagged' END,
    'collective_referrals',
    p_referral_id,
    jsonb_build_object('flagged', v_referral.flagged, 'status', v_referral.status::text),
    jsonb_build_object('flagged', p_flagged, 'status', v_referral.status::text),
    v_reason
  );

  RETURN jsonb_build_object('ok', true, 'flagged', p_flagged);
END
$function$;

REVOKE ALL ON FUNCTION public.manage_collective_referral_flag(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_collective_referral_flag(uuid, boolean, text) TO authenticated, service_role;
