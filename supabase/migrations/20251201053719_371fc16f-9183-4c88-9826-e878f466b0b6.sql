-- Add recovery code fields to profiles table for 2FA email recovery
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS two_factor_recovery_code TEXT,
ADD COLUMN IF NOT EXISTS two_factor_recovery_expires TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups during recovery
CREATE INDEX IF NOT EXISTS idx_profiles_recovery_code 
ON profiles(two_factor_recovery_code) 
WHERE two_factor_recovery_code IS NOT NULL;