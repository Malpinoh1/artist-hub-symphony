
INSERT INTO public.plans (code, name, description, price_usd, duration_days, features, sort_order, is_active)
VALUES (
  'per_release',
  'Pay Per Release',
  'One-time payment for a single release submission',
  14,
  0,
  '["Submit 1 release","No subscription","Pay only when you release","All major DSPs included"]'::jsonb,
  0,
  true
)
ON CONFLICT (code) DO UPDATE SET
  price_usd = EXCLUDED.price_usd,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  is_active = true;

CREATE TABLE IF NOT EXISTS public.release_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','used')),
  consumed_release_id uuid,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.release_credits TO authenticated;
GRANT ALL ON public.release_credits TO service_role;
ALTER TABLE public.release_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own credits" ON public.release_credits;
CREATE POLICY "Users view own credits" ON public.release_credits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_is_admin());
CREATE INDEX IF NOT EXISTS idx_release_credits_user_available
  ON public.release_credits(user_id) WHERE status = 'available';

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'finance_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'distribution_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.release_gate_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  cutoff_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.release_gate_config (id, cutoff_at)
VALUES (true, now()) ON CONFLICT (id) DO NOTHING;
GRANT SELECT ON public.release_gate_config TO authenticated;
GRANT ALL ON public.release_gate_config TO service_role;
ALTER TABLE public.release_gate_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads gate config" ON public.release_gate_config;
CREATE POLICY "Anyone reads gate config" ON public.release_gate_config
  FOR SELECT TO authenticated USING (true);
