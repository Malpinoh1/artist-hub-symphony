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
END
$test$;
