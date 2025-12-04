-- Add email confirmation token and status columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_confirmation_token uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email_confirmation_sent_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email_confirmed_at timestamp with time zone DEFAULT NULL;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmation_token 
ON public.profiles(email_confirmation_token) 
WHERE email_confirmation_token IS NOT NULL;