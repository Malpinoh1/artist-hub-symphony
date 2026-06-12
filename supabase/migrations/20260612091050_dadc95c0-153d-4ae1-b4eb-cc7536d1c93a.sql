-- 1) Track creation time on releases and grandfather all existing releases
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
UPDATE public.releases
SET created_at = LEAST(
  COALESCE(updated_at, now()),
  COALESCE((SELECT cutoff_at - interval '1 day' FROM public.release_gate_config LIMIT 1), now() - interval '1 day')
);

-- 2) Fix the submission gate check (was referencing non-existent columns r.user_id / r.created_at)
CREATE OR REPLACE FUNCTION public.check_release_submission_allowed(uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    WHERE r.artist_id = uid AND r.created_at < v_cutoff
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

  -- Honour admin-managed subscriptions in the subscribers table too
  IF EXISTS (
    SELECT 1 FROM public.subscribers sb
    WHERE sb.user_id = uid AND sb.subscribed = true
      AND (sb.subscription_end IS NULL OR sb.subscription_end > now())
  ) THEN
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
$function$;

-- 3) Fix the enforcement trigger function and actually attach the trigger
CREATE OR REPLACE FUNCTION public.enforce_release_submission_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_credit_id uuid;
BEGIN
  IF public.user_has_distribution_role() THEN
    RETURN NEW;
  END IF;

  v_result := public.check_release_submission_allowed(NEW.artist_id);
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
$function$;

DROP TRIGGER IF EXISTS trg_enforce_release_submission_gate ON public.releases;
CREATE TRIGGER trg_enforce_release_submission_gate
AFTER INSERT ON public.releases
FOR EACH ROW EXECUTE FUNCTION public.enforce_release_submission_gate();

-- 4) Remove subscription requirement from data-access policies (dashboard open to all; only submission is paid)
DROP POLICY IF EXISTS "Users can view releases they have access to" ON public.releases;
CREATE POLICY "Users can view releases they have access to" ON public.releases
FOR SELECT USING (user_is_admin() OR has_account_access(artist_id, 'viewer'::account_role));

DROP POLICY IF EXISTS "Users can view earnings for accounts they have access to" ON public.earnings;
CREATE POLICY "Users can view earnings for accounts they have access to" ON public.earnings
FOR SELECT USING (user_is_admin() OR has_account_access(artist_id, 'viewer'::account_role));

DROP POLICY IF EXISTS "Users can view withdrawals for accounts they have access to" ON public.withdrawals;
CREATE POLICY "Users can view withdrawals for accounts they have access to" ON public.withdrawals
FOR SELECT USING (user_is_admin() OR has_account_access(artist_id, 'viewer'::account_role));

DROP POLICY IF EXISTS "Users can view artist profiles they have access to" ON public.artists;
CREATE POLICY "Users can view artist profiles they have access to" ON public.artists
FOR SELECT USING (user_is_admin() OR has_account_access(id, 'viewer'::account_role));

DROP POLICY IF EXISTS "Users can view activity logs for accounts they have access to" ON public.activity_logs;
CREATE POLICY "Users can view activity logs for accounts they have access to" ON public.activity_logs
FOR SELECT USING (user_is_admin() OR has_account_access(artist_id, 'viewer'::account_role));

DROP POLICY IF EXISTS "Artists can view their own credit transactions" ON public.credit_transactions;
CREATE POLICY "Artists can view their own credit transactions" ON public.credit_transactions
FOR SELECT USING (user_is_admin() OR has_account_access(artist_id, 'viewer'::account_role));

DROP POLICY IF EXISTS "Artists can manage tracks for their releases" ON public.release_tracks;
CREATE POLICY "Artists can manage tracks for their releases" ON public.release_tracks
FOR ALL USING (EXISTS (
  SELECT 1 FROM releases
  WHERE releases.id = release_tracks.release_id
    AND (user_is_admin() OR has_account_access(releases.artist_id, 'manager'::account_role))
));

DROP POLICY IF EXISTS "Users can manage store selections for their releases" ON public.release_store_selections;
CREATE POLICY "Users can manage store selections for their releases" ON public.release_store_selections
FOR ALL USING (EXISTS (
  SELECT 1 FROM releases
  WHERE releases.id = release_store_selections.release_id
    AND (user_is_admin() OR has_account_access(releases.artist_id, 'manager'::account_role))
));

DROP POLICY IF EXISTS "Users can manage audio clips for their releases" ON public.release_audio_clips;
CREATE POLICY "Users can manage audio clips for their releases" ON public.release_audio_clips
FOR ALL USING (EXISTS (
  SELECT 1 FROM releases
  WHERE releases.id = release_audio_clips.release_id
    AND (user_is_admin() OR has_account_access(releases.artist_id, 'manager'::account_role))
));

DROP POLICY IF EXISTS "Users can manage free tracks for their releases" ON public.release_free_tracks;
CREATE POLICY "Users can manage free tracks for their releases" ON public.release_free_tracks
FOR ALL USING (EXISTS (
  SELECT 1 FROM releases
  WHERE releases.id = release_free_tracks.release_id
    AND (user_is_admin() OR has_account_access(releases.artist_id, 'manager'::account_role))
));