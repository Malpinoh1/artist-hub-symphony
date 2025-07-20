
-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Account admins can manage team access" ON account_access;
DROP POLICY IF EXISTS "Account owners can manage access" ON account_access;
DROP POLICY IF EXISTS "Users can view their own access" ON account_access;
DROP POLICY IF EXISTS "Team members can view invitations" ON account_invitations;
DROP POLICY IF EXISTS "Account owners can manage their invitations" ON account_invitations;

-- Create simple, non-recursive policies for account_access
-- Only account owners can manage access (this avoids recursion completely)
CREATE POLICY "Only account owners can manage access"
  ON account_access
  FOR ALL
  USING (auth.uid() = account_owner_id);

-- Users can view their own access records
CREATE POLICY "Users can view own access"
  ON account_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create simple policies for account_invitations
-- Only account owners can manage their invitations
CREATE POLICY "Account owners manage invitations"
  ON account_invitations
  FOR ALL
  USING (auth.uid() = account_owner_id);

-- Create a security definer function to safely check admin access
CREATE OR REPLACE FUNCTION public.is_account_admin(target_account_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM account_access
    WHERE account_owner_id = target_account_id
    AND user_id = auth.uid()
    AND role = 'account_admin'
  );
$$;

-- Now add a policy that uses the function for viewing invitations by admins
CREATE POLICY "Account admins can view invitations"
  ON account_invitations
  FOR SELECT
  USING (
    auth.uid() = account_owner_id OR
    public.is_account_admin(account_owner_id)
  );
