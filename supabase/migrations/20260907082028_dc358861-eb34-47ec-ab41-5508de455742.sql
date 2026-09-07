
REVOKE ALL ON FUNCTION public.update_my_collective_profile(text,text,text,text,text,jsonb,text[],text,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_my_collective_profile(text,text,text,text,text,jsonb,text[],text,boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_referral_activity() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_referral_activity() TO authenticated;

REVOKE ALL ON FUNCTION public.is_active_collective_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_active_collective_member(uuid) TO authenticated, service_role;
