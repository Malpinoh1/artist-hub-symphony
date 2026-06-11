-- Deactivate duplicate legacy plan; keep the canonical per_release plan
UPDATE public.plans SET is_active = false WHERE code = 'pay_per_release';