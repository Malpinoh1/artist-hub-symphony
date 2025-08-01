
-- Add subscription requirement checks and 2FA support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Create a function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.user_has_active_subscription(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT subscribed FROM subscribers WHERE subscribers.user_id = $1),
    false
  );
$$;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.user_is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'admin'
  );
$$;

-- Update RLS policies to require subscription for dashboard access
DROP POLICY IF EXISTS "Users can view releases they have access to" ON releases;
CREATE POLICY "Users can view releases they have access to" ON releases
FOR SELECT
USING (
  user_is_admin() OR 
  (user_has_active_subscription() AND has_account_access(artist_id, 'viewer'::account_role))
);

DROP POLICY IF EXISTS "Users can view earnings for accounts they have access to" ON earnings;
CREATE POLICY "Users can view earnings for accounts they have access to" ON earnings
FOR SELECT
USING (
  user_is_admin() OR 
  (user_has_active_subscription() AND has_account_access(artist_id, 'viewer'::account_role))
);

DROP POLICY IF EXISTS "Users can view withdrawals for accounts they have access to" ON withdrawals;
CREATE POLICY "Users can view withdrawals for accounts they have access to" ON withdrawals
FOR SELECT
USING (
  user_is_admin() OR 
  (user_has_active_subscription() AND has_account_access(artist_id, 'viewer'::account_role))
);

-- Update artists table policies
DROP POLICY IF EXISTS "Users can view artist profiles they have access to" ON artists;
CREATE POLICY "Users can view artist profiles they have access to" ON artists
FOR SELECT
USING (
  user_is_admin() OR 
  (user_has_active_subscription() AND has_account_access(id, 'viewer'::account_role))
);

-- Create sessions table for 2FA
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  two_factor_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON user_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
FOR ALL
USING (auth.uid() = user_id);
