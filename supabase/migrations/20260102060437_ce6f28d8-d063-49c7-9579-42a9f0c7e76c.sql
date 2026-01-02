-- Add UPDATE policy for admins to update any release (including status changes)
CREATE POLICY "Admins can update all releases" 
ON public.releases 
FOR UPDATE 
USING (user_is_admin());

-- Add DELETE policy for admins (optional, for completeness)
CREATE POLICY "Admins can delete releases" 
ON public.releases 
FOR DELETE 
USING (user_is_admin());