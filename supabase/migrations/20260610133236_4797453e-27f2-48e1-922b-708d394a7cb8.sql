
CREATE OR REPLACE FUNCTION public.user_has_finance_role(uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role IN ('admin'::user_role,'finance_manager'::user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_distribution_role(uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role IN ('admin'::user_role,'distribution_manager'::user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_admin_role(uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role IN ('admin'::user_role,'finance_manager'::user_role,'distribution_manager'::user_role)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_has_finance_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_distribution_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_any_admin_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_finance_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_distribution_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_any_admin_role(uuid) TO authenticated;

DROP POLICY IF EXISTS "Finance role manages withdrawals" ON public.withdrawals;
CREATE POLICY "Finance role manages withdrawals" ON public.withdrawals
  FOR ALL TO authenticated
  USING (public.user_has_finance_role())
  WITH CHECK (public.user_has_finance_role());

DROP POLICY IF EXISTS "Distribution role manages releases" ON public.releases;
CREATE POLICY "Distribution role manages releases" ON public.releases
  FOR ALL TO authenticated
  USING (public.user_has_distribution_role())
  WITH CHECK (public.user_has_distribution_role());

CREATE OR REPLACE FUNCTION public.check_release_submission_allowed(uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cutoff timestamptz;
  v_has_prior boolean;
  v_active_sub boolean;
  v_credit_id uuid;
BEGIN
  IF public.user_has_distribution_role(uid) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'admin');
  END IF;

  SELECT cutoff_at INTO v_cutoff FROM public.release_gate_config LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.releases r
    WHERE r.user_id = uid AND r.created_at < v_cutoff
  ) INTO v_has_prior;
  IF v_has_prior THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'grandfathered');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = uid AND s.status = 'active' AND s.end_date > now()
  ) INTO v_active_sub;
  IF v_active_sub THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'subscription');
  END IF;

  SELECT id INTO v_credit_id FROM public.release_credits
  WHERE user_id = uid AND status = 'available'
  ORDER BY created_at LIMIT 1;
  IF v_credit_id IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'credit', 'credit_id', v_credit_id);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'reason', 'payment_required');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.check_release_submission_allowed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_release_submission_allowed(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_release_submission_gate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
  v_credit_id uuid;
BEGIN
  IF public.user_has_distribution_role() THEN
    RETURN NEW;
  END IF;

  v_result := public.check_release_submission_allowed(NEW.user_id);
  IF (v_result->>'allowed')::boolean = false THEN
    RAISE EXCEPTION 'Release submission requires payment. Choose Pay-Per-Release ($14) or subscribe.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_result->>'reason' = 'credit' THEN
    v_credit_id := (v_result->>'credit_id')::uuid;
    UPDATE public.release_credits
      SET status = 'used', consumed_at = now(), consumed_release_id = NEW.id
    WHERE id = v_credit_id AND status = 'available';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_release_submission_gate ON public.releases;
CREATE TRIGGER trg_enforce_release_submission_gate
  BEFORE INSERT ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.enforce_release_submission_gate();
