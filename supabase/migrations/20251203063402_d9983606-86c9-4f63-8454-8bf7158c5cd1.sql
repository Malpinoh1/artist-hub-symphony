-- Fix update_updated_at_column function search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Add RLS policies for platform_analytics table
CREATE POLICY "Admins can manage platform analytics" 
ON public.platform_analytics 
FOR ALL 
USING (user_is_admin());

CREATE POLICY "Authenticated users can view platform analytics" 
ON public.platform_analytics 
FOR SELECT 
USING (auth.uid() IS NOT NULL);