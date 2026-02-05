-- Add rejection_reason and approved_at columns to withdrawals table
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS naira_amount NUMERIC;