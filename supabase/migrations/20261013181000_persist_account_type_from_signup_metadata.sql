CREATE OR REPLACE FUNCTION public.handle_new_artist_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.artists a WHERE a.id = NEW.id) THEN
    INSERT INTO public.artists (
      id, name, email, phone, wallet_balance, total_earnings,
      available_balance, status, ban_reason, team_name, credit_balance,
      account_name, account_type
    ) VALUES (
      NEW.id,
      coalesce(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1), NEW.email),
      NEW.email, null::text, 0.00::numeric, 0::numeric, 0::numeric,
      'active'::text, null::text, null::text, 0::numeric, null::text,
      CASE WHEN lower(coalesce(NEW.raw_user_meta_data ->> 'account_type','artist')) = 'label' THEN 'label' ELSE 'artist' END
    );
  ELSE
    UPDATE public.artists
    SET account_type = CASE WHEN lower(coalesce(NEW.raw_user_meta_data ->> 'account_type','artist')) = 'label' THEN 'label' ELSE 'artist' END
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;