
-- Add credit_balance to artists table
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS credit_balance numeric DEFAULT 0;

-- Create credit_transactions table to log all credit/deduction events
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artists(id),
  amount numeric NOT NULL,
  type text NOT NULL, -- 'credit_added', 'credit_deducted', 'withdrawal_deduction'
  description text,
  withdrawal_id uuid REFERENCES public.withdrawals(id),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add credit deduction fields to withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS credit_deduction numeric DEFAULT 0;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS final_amount numeric;

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage all
CREATE POLICY "Admins can manage all credit transactions"
ON public.credit_transactions FOR ALL
USING (user_is_admin());

-- RLS: Artists can view their own
CREATE POLICY "Artists can view their own credit transactions"
ON public.credit_transactions FOR SELECT
USING (
  user_is_admin() OR 
  (user_has_active_subscription() AND has_account_access(artist_id, 'viewer'::account_role))
);
