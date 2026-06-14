-- Grant finance_manager and distribution_manager the same platform-wide access as admin.
-- We do this by widening user_is_admin() to recognise any admin-tier role.
-- All existing RLS policies and SECURITY DEFINER helpers (process_income,
-- process_royalty_upload, enforce_release_submission_gate, etc.) call
-- user_is_admin(), so this single change cascades platform-wide.

CREATE OR REPLACE FUNCTION public.user_is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = $1
      AND role IN ('admin'::user_role, 'finance_manager'::user_role, 'distribution_manager'::user_role)
  );
$$;