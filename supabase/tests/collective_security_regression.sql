-- Read-only database assertions for Collective security regressions.
-- Run against a disposable/test database after applying migrations; this file
-- does not create or mutate member/application records.

DO $test$
DECLARE
  profile_definition text;
BEGIN
  SELECT pg_get_functiondef('public.get_collective_public_profile(text)'::regprocedure)
  INTO profile_definition;

  IF position('v_m.discoverable' IN profile_definition) = 0 THEN
    RAISE EXCEPTION 'Collective public-profile RPC must enforce discoverability';
  END IF;

  IF NOT has_function_privilege('anon', 'public.get_collective_public_profile(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Public profile RPC should remain callable by anonymous visitors';
  END IF;

  IF has_function_privilege('anon', 'public.get_collective_admin_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role must not execute Collective admin statistics RPC';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_collective_admin_stats()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated role must retain access to the admin stats RPC (function performs admin authorization)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'protect_collective_submission_member_update'
      AND tgrelid = 'public.collective_submissions'::regclass
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Member submission updates must protect reviewer-controlled fields';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'collective_submissions'
      AND policyname = 'Members create own submissions'
      AND with_check ILIKE '%deadline%'
  ) THEN
    RAISE EXCEPTION 'New submissions must be rejected for expired opportunities';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'collective-evidence'
      AND public = false
      AND file_size_limit = 10485760
      AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
  ) THEN
    RAISE EXCEPTION 'Collective evidence bucket must be private and constrained by type and size';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collective_submissions'
      AND column_name = 'evidence_path'
  ) THEN
    RAISE EXCEPTION 'Contribution submissions must persist private evidence paths';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'collective_notification_deliveries'
      AND c.relkind = 'r'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Collective email delivery state must use RLS';
  END IF;

  IF has_table_privilege('anon', 'public.collective_notification_deliveries', 'SELECT')
     OR has_table_privilege('authenticated', 'public.collective_notification_deliveries', 'SELECT') THEN
    RAISE EXCEPTION 'Collective email delivery state must not be readable by client roles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'collective_audit_logs'
      AND c.relkind = 'r'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Collective audit logs must use RLS';
  END IF;

  IF has_table_privilege('anon', 'public.collective_audit_logs', 'SELECT')
     OR has_table_privilege('authenticated', 'public.collective_audit_logs', 'SELECT') THEN
    RAISE EXCEPTION 'Collective audit logs must only be read through the admin-checked RPC';
  END IF;

  IF has_function_privilege('anon', 'public.get_collective_audit_logs(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role must not read Collective audit history';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_collective_announcement_notification_once')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_collective_opportunity_notification_once') THEN
    RAISE EXCEPTION 'Collective broadcast notifications must have database-level deduplication';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_collective_apps_active_email')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_collective_referrals_unique') THEN
    RAISE EXCEPTION 'Application and referral uniqueness guards must remain in place';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_collective_audit_logs(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated admin UI must retain access to the admin-checked audit RPC';
  END IF;

  IF has_function_privilege('anon', 'public.manage_collective_member(uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous role must not execute member status management';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.manage_collective_member(uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated admin UI must retain access to the admin-checked member management RPC';
  END IF;
END
$test$;
