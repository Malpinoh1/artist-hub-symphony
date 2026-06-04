
-- PLANS
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_usd numeric(10,2) NOT NULL,
  duration_days integer NOT NULL,
  release_limit integer,
  supports_auto_renew boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid())) WITH CHECK (public.user_is_admin(auth.uid()));

INSERT INTO public.plans (code, name, description, price_usd, duration_days, release_limit, sort_order, features) VALUES
  ('pay_per_release', 'Pay Per Release', 'Single release distribution', 14.00, 365, 1, 1,
    '["Distribution to all major platforms","Fan link page","Keep 100% of rights","Basic analytics","45 days processing","Email support"]'::jsonb),
  ('annual', 'Annual Plan', 'Up to 15 releases per year', 36.00, 365, 15, 2,
    '["Distribution to all major platforms","Premium fan link page","Keep 100% of rights","Advanced analytics","30 days processing","Priority support","YouTube Content ID","Up to 15 releases per year"]'::jsonb),
  ('unlimited', 'Unlimited Artists', 'Unlimited artists & releases', 100.00, 365, NULL, 3,
    '["Everything in Annual","Unlimited artists","Unlimited releases","15 days priority processing","Premium support","YouTube Content ID","Social media promotion","Dedicated account manager"]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id),
  flutterwave_tx_ref text NOT NULL UNIQUE,
  flutterwave_transaction_id text,
  amount_usd numeric(10,2) NOT NULL,
  amount_charged numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  fx_rate numeric(14,4),
  payment_method text,
  status text NOT NULL DEFAULT 'pending',
  customer_email text,
  raw_response jsonb,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.user_is_admin(auth.uid()));
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.user_is_admin(auth.uid())) WITH CHECK (public.user_is_admin(auth.uid()));

-- SUBSCRIPTIONS (new structured table)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  auto_renew boolean NOT NULL DEFAULT true,
  last_payment_id uuid REFERENCES public.payments(id),
  flutterwave_card_token text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON public.subscriptions(status);
GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subs" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.user_is_admin(auth.uid()));
CREATE POLICY "Users update own auto_renew" ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage subs" ON public.subscriptions FOR ALL TO authenticated
  USING (public.user_is_admin(auth.uid())) WITH CHECK (public.user_is_admin(auth.uid()));

CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
