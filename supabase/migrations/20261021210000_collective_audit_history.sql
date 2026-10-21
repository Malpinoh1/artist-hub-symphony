-- Minimal, private audit trail for Collective operations.
-- Store status/visibility transitions, not application answers, emails or evidence content.

CREATE TABLE IF NOT EXISTS public.collective_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  old_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.collective_audit_logs ADD COLUMN IF NOT EXISTS event_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_collective_audit_logs_event_key
  ON public.collective_audit_logs (event_key) WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collective_audit_logs_created
  ON public.collective_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collective_audit_logs_target
  ON public.collective_audit_logs (target_table, target_id, created_at DESC);

ALTER TABLE public.collective_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.collective_audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.collective_audit_logs TO service_role;

CREATE OR REPLACE FUNCTION public.log_collective_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_target_id uuid;
BEGIN
  -- Edge Functions using the service role add explicit actor-aware audit entries.
  -- This trigger records authenticated direct changes made through authorised UI/RPC paths.
  IF v_actor IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;
  v_target_id := COALESCE(v_new ->> 'id', v_old ->> 'id')::uuid;

  INSERT INTO public.collective_audit_logs (
    actor_id, action, target_table, target_id, old_state, new_state
  ) VALUES (
    v_actor,
    lower(TG_OP) || ':' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    v_target_id,
    CASE WHEN v_old IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
      'status', v_old -> 'status',
      'visibility', v_old -> 'visibility',
      'discoverable', v_old -> 'discoverable',
      'handle', v_old -> 'handle',
      'roles', v_old -> 'roles',
      'points', v_old -> 'points',
      'flagged', v_old -> 'flagged',
      'published_at', v_old -> 'published_at',
      'read', v_old -> 'read'
    )) END,
    CASE WHEN v_new IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
      'status', v_new -> 'status',
      'visibility', v_new -> 'visibility',
      'discoverable', v_new -> 'discoverable',
      'handle', v_new -> 'handle',
      'roles', v_new -> 'roles',
      'points', v_new -> 'points',
      'flagged', v_new -> 'flagged',
      'published_at', v_new -> 'published_at',
      'read', v_new -> 'read'
    )) END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END
$function$;

DROP TRIGGER IF EXISTS collective_audit_applications ON public.collective_applications;
CREATE TRIGGER collective_audit_applications
AFTER INSERT OR UPDATE OR DELETE ON public.collective_applications
FOR EACH ROW EXECUTE FUNCTION public.log_collective_audit_change();

DROP TRIGGER IF EXISTS collective_audit_members ON public.collective_members;
CREATE TRIGGER collective_audit_members
AFTER INSERT OR UPDATE OR DELETE ON public.collective_members
FOR EACH ROW EXECUTE FUNCTION public.log_collective_audit_change();

DROP TRIGGER IF EXISTS collective_audit_referrals ON public.collective_referrals;
CREATE TRIGGER collective_audit_referrals
AFTER INSERT OR UPDATE OR DELETE ON public.collective_referrals
FOR EACH ROW EXECUTE FUNCTION public.log_collective_audit_change();

DROP TRIGGER IF EXISTS collective_audit_opportunities ON public.collective_opportunities;
CREATE TRIGGER collective_audit_opportunities
AFTER INSERT OR UPDATE OR DELETE ON public.collective_opportunities
FOR EACH ROW EXECUTE FUNCTION public.log_collective_audit_change();

DROP TRIGGER IF EXISTS collective_audit_submissions ON public.collective_submissions;
CREATE TRIGGER collective_audit_submissions
AFTER INSERT OR UPDATE OR DELETE ON public.collective_submissions
FOR EACH ROW EXECUTE FUNCTION public.log_collective_audit_change();

DROP TRIGGER IF EXISTS collective_audit_announcements ON public.collective_announcements;
CREATE TRIGGER collective_audit_announcements
AFTER INSERT OR UPDATE OR DELETE ON public.collective_announcements
FOR EACH ROW EXECUTE FUNCTION public.log_collective_audit_change();

REVOKE ALL ON FUNCTION public.log_collective_audit_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_collective_audit_logs(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  actor_id uuid,
  actor_label text,
  action text,
  target_table text,
  target_id uuid,
  old_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.actor_id,
    COALESCE(m.display_name, u.email, a.actor_id::text, 'System') AS actor_label,
    a.action,
    a.target_table,
    a.target_id,
    a.old_state,
    a.new_state,
    a.reason,
    a.created_at
  FROM public.collective_audit_logs a
  LEFT JOIN auth.users u ON u.id = a.actor_id
  LEFT JOIN public.collective_members m ON m.user_id = a.actor_id
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
END
$function$;

REVOKE ALL ON FUNCTION public.get_collective_audit_logs(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_collective_audit_logs(integer) TO authenticated, service_role;


-- Controlled member status changes require a reason and are recorded atomically
-- with the status update.
CREATE OR REPLACE FUNCTION public.manage_collective_member(
  p_member_id uuid,
  p_status text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_member public.collective_members;
  v_reason text := left(trim(COALESCE(p_reason, '')), 1000);
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF p_status NOT IN ('active', 'suspended', 'inactive') THEN
    RAISE EXCEPTION 'Invalid member status';
  END IF;

  IF length(v_reason) < 10 THEN
    RAISE EXCEPTION 'Please provide a reason of at least 10 characters';
  END IF;

  SELECT * INTO v_member
  FROM public.collective_members
  WHERE id = p_member_id
  FOR UPDATE;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Collective member not found';
  END IF;

  IF v_member.status::text = p_status THEN
    RETURN jsonb_build_object('ok', true, 'already_processed', true, 'status', p_status);
  END IF;

  UPDATE public.collective_members
  SET status = p_status::public.collective_member_status,
      updated_at = now()
  WHERE id = p_member_id;

  INSERT INTO public.collective_audit_logs (
    actor_id, action, target_table, target_id, old_state, new_state, reason
  ) VALUES (
    auth.uid(),
    'member_status_change',
    'collective_members',
    p_member_id,
    jsonb_build_object('status', v_member.status::text),
    jsonb_build_object('status', p_status),
    v_reason
  );

  RETURN jsonb_build_object('ok', true, 'status', p_status);
END
$function$;

REVOKE ALL ON FUNCTION public.manage_collective_member(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_collective_member(uuid, text, text) TO authenticated, service_role;
