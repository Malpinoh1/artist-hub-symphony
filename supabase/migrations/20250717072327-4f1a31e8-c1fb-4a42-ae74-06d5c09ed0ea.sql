
-- Create enum for account access roles
CREATE TYPE account_role AS ENUM ('account_admin', 'manager', 'viewer');

-- Create table for account invitations
CREATE TABLE account_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role account_role NOT NULL DEFAULT 'viewer',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_owner_id, invited_email)
);

-- Create table for account access (accepted invitations)
CREATE TABLE account_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role account_role NOT NULL DEFAULT 'viewer',
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_owner_id, user_id)
);

-- Enable RLS on account_invitations
ALTER TABLE account_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_invitations
CREATE POLICY "Account owners can manage their invitations"
  ON account_invitations
  FOR ALL
  USING (auth.uid() = account_owner_id);

CREATE POLICY "Account admins and managers can view invitations"
  ON account_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_access 
      WHERE account_access.account_owner_id = account_invitations.account_owner_id
      AND account_access.user_id = auth.uid()
      AND account_access.role IN ('account_admin', 'manager')
    )
  );

-- Enable RLS on account_access
ALTER TABLE account_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_access
CREATE POLICY "Account owners can manage access"
  ON account_access
  FOR ALL
  USING (auth.uid() = account_owner_id);

CREATE POLICY "Users can view their own access"
  ON account_access
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Account admins can manage access"
  ON account_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_access aa
      WHERE aa.account_owner_id = account_access.account_owner_id
      AND aa.user_id = auth.uid()
      AND aa.role = 'account_admin'
    )
  );

-- Function to check if user has access to an account
CREATE OR REPLACE FUNCTION has_account_access(target_account_id UUID, required_role account_role DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Account owner always has access
  IF auth.uid() = target_account_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has the required role or higher
  RETURN EXISTS (
    SELECT 1 FROM account_access
    WHERE account_owner_id = target_account_id
    AND user_id = auth.uid()
    AND (
      (required_role = 'viewer' AND role IN ('viewer', 'manager', 'account_admin')) OR
      (required_role = 'manager' AND role IN ('manager', 'account_admin')) OR
      (required_role = 'account_admin' AND role = 'account_admin')
    )
  );
END;
$$;

-- Update existing tables to support multi-user access
-- Update releases table RLS policies
DROP POLICY IF EXISTS "Artists can view their own releases" ON releases;
DROP POLICY IF EXISTS "Artists can create their own releases" ON releases;

CREATE POLICY "Users can view releases they have access to"
  ON releases
  FOR SELECT
  USING (
    has_account_access(artist_id, 'viewer') OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );

CREATE POLICY "Users can create releases for accounts they manage"
  ON releases
  FOR INSERT
  WITH CHECK (
    has_account_access(artist_id, 'manager')
  );

-- Update artists table RLS policies  
DROP POLICY IF EXISTS "Artists can view their own profile" ON artists;
DROP POLICY IF EXISTS "Artists can update their own profile" ON artists;
DROP POLICY IF EXISTS "Users can view their own artist profile" ON artists;
DROP POLICY IF EXISTS "Users can update their own artist profile" ON artists;

CREATE POLICY "Users can view artist profiles they have access to"
  ON artists
  FOR SELECT
  USING (
    has_account_access(id, 'viewer') OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );

CREATE POLICY "Users can update artist profiles they manage"
  ON artists
  FOR UPDATE
  USING (
    has_account_access(id, 'manager')
  );

-- Update earnings table RLS policies
DROP POLICY IF EXISTS "Artists can view their own earnings" ON earnings;

CREATE POLICY "Users can view earnings for accounts they have access to"
  ON earnings
  FOR SELECT
  USING (
    has_account_access(artist_id, 'viewer') OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );

-- Update withdrawals table RLS policies
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can insert their own withdrawals" ON withdrawals;

CREATE POLICY "Users can view withdrawals for accounts they have access to"
  ON withdrawals
  FOR SELECT
  USING (
    has_account_access(artist_id, 'viewer') OR
    (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  );

CREATE POLICY "Users can create withdrawals for accounts they manage"
  ON withdrawals
  FOR INSERT
  WITH CHECK (
    has_account_access(artist_id, 'manager')
  );
