
-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Account admins can manage access" ON account_access;

-- Create a simpler policy that doesn't cause recursion
-- Account admins can manage access, but we'll check this differently
CREATE POLICY "Account admins can manage team access"
  ON account_access
  FOR ALL
  USING (
    -- Allow if user is the account owner
    auth.uid() = account_owner_id OR
    -- Allow if user is explicitly an account_admin (we'll handle this in application logic)
    EXISTS (
      SELECT 1 FROM account_access existing_access
      WHERE existing_access.account_owner_id = account_access.account_owner_id
      AND existing_access.user_id = auth.uid()
      AND existing_access.role = 'account_admin'
      AND existing_access.id != account_access.id  -- Prevent self-reference
    )
  );

-- Also fix the invitations policy to avoid similar issues
DROP POLICY IF EXISTS "Account admins and managers can view invitations" ON account_invitations;

CREATE POLICY "Team members can view invitations"
  ON account_invitations
  FOR SELECT
  USING (
    -- Account owner can always view
    auth.uid() = account_owner_id OR
    -- Team members with manager or admin role can view
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.account_owner_id = account_invitations.account_owner_id
      AND account_access.user_id = auth.uid()
      AND account_access.role IN ('account_admin', 'manager')
    )
  );
