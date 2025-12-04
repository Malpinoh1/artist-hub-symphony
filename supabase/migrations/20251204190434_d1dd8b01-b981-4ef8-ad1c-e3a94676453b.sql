-- Add email_opt_in column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_opt_in boolean DEFAULT false;

-- Update handle_new_user function to accept email_opt_in from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, marketing_emails, email_opt_in)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 
    true,
    COALESCE((NEW.raw_user_meta_data->>'email_opt_in')::boolean, false)
  );
  
  -- Add to user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;