-- Fix function search_path security issues

-- Update is_account_admin function
CREATE OR REPLACE FUNCTION public.is_account_admin(target_account_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM account_access
    WHERE account_owner_id = target_account_id
    AND user_id = auth.uid()
    AND role = 'account_admin'
  );
$function$;

-- Update has_account_access function
CREATE OR REPLACE FUNCTION public.has_account_access(target_account_id uuid, required_role account_role DEFAULT 'viewer'::account_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

-- Update user_has_active_subscription function
CREATE OR REPLACE FUNCTION public.user_has_active_subscription(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT COALESCE(
    (SELECT subscribed FROM subscribers WHERE subscribers.user_id = $1),
    false
  );
$function$;

-- Update user_is_admin function
CREATE OR REPLACE FUNCTION public.user_is_admin(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 
    AND role = 'admin'
  );
$function$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, marketing_emails)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), true);
  
  -- Add to user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- Update has_role function (uuid, user_role version)
CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, role user_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
    AND user_roles.role = $2
  );
END;
$function$;

-- Update has_role function (text version) - fix empty function
CREATE OR REPLACE FUNCTION public.has_role(role_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text = role_name
    );
END;
$function$;