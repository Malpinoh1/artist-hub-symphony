CREATE POLICY "Admins can delete subscribers" ON public.subscribers FOR DELETE USING (user_is_admin());

CREATE POLICY "Admins can view all subscribers" ON public.subscribers FOR SELECT USING (user_is_admin());

CREATE POLICY "Admins can update all subscribers" ON public.subscribers FOR UPDATE USING (user_is_admin());