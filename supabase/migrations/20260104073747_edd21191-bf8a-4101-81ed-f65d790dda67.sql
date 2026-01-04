-- Allow admins to create releases for any artist
CREATE POLICY "Admins can create releases for any artist" 
ON public.releases 
FOR INSERT 
WITH CHECK (user_is_admin());