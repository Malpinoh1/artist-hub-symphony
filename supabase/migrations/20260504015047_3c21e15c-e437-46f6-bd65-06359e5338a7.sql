
-- 1) artists: drop overly-permissive ALL/true policy, replace with admin-only management
DROP POLICY IF EXISTS "Admins can view all artists" ON public.artists;
CREATE POLICY "Admins can manage all artists"
  ON public.artists
  FOR ALL
  TO authenticated
  USING (public.user_is_admin())
  WITH CHECK (public.user_is_admin());

-- 2) subscribers: lock down INSERT and UPDATE to the user's own row
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

CREATE POLICY "Users insert own subscription"
  ON public.subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND email = auth.email()
  );

CREATE POLICY "Users update own subscription"
  ON public.subscribers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR email = auth.email())
  WITH CHECK (auth.uid() = user_id OR email = auth.email());

-- 3) split_invitations: remove "Public can read by token" wide-open SELECT
DROP POLICY IF EXISTS "Public can read by token" ON public.split_invitations;
-- Public token-based lookup is now handled exclusively by the AcceptSplit edge/server flow
-- (or via authenticated invited-user policy already in place).

-- 4) Storage buckets: restrict audio_files and release_artwork SELECT to owner or admin
DROP POLICY IF EXISTS "Allow users to view their audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their release artwork" ON storage.objects;

CREATE POLICY "Owners or admins can view audio files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio_files'
    AND (auth.uid() = owner OR public.user_is_admin())
  );

CREATE POLICY "Owners or admins can view release artwork"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'release_artwork'
    AND (auth.uid() = owner OR public.user_is_admin())
  );

-- 5) Realtime publication: remove sensitive tables to prevent broadcast leaks
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'artists','withdrawals','subscribers','profiles','user_sessions',
    'platform_earnings','royalty_statements','incomes','income_transactions',
    'earnings','royalty_splits','user_roles','account_access','account_invitations'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN
      -- ignore if not in publication
      NULL;
    END;
  END LOOP;
END $$;
