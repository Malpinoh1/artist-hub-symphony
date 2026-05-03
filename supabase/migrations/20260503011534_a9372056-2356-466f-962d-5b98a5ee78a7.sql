CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL DEFAULT 'USD',
  quote text NOT NULL DEFAULT 'NGN',
  rate numeric NOT NULL,
  source text NOT NULL DEFAULT 'exchangerate.host',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fx" ON public.exchange_rates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage fx" ON public.exchange_rates
  FOR ALL USING (public.user_is_admin()) WITH CHECK (public.user_is_admin());

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON public.exchange_rates (base, quote, fetched_at DESC);

INSERT INTO public.exchange_rates (base, quote, rate, source) VALUES ('USD', 'NGN', 1250, 'seed');