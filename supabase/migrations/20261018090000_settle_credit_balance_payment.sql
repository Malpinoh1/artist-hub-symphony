create or replace function public.settle_credit_balance_payment(
  p_payment_id uuid,
  p_transaction_id text,
  p_payment_method text,
  p_raw_response jsonb
)
returns numeric
language plpgsql
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_credit_usd numeric;
  v_current_balance numeric;
  v_new_balance numeric;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment record not found'; end if;

  select coalesce((v_payment.raw_response->'checkout_meta'->>'credit_amount_usd')::numeric, v_payment.amount_usd)
    into v_credit_usd;

  if coalesce((v_payment.raw_response->'checkout_meta'->>'is_credit_payment')::boolean, false) is not true
     or v_credit_usd <= 0 then
    raise exception 'Not a valid credit balance payment';
  end if;

  if v_payment.status = 'successful' then
    select coalesce(credit_balance, 0) into v_current_balance from public.artists where id = v_payment.user_id;
    return coalesce(v_current_balance, 0);
  end if;
  if v_payment.status <> 'pending' then raise exception 'Credit payment is not pending'; end if;

  update public.payments
  set status = 'successful', flutterwave_transaction_id = p_transaction_id,
      payment_method = p_payment_method, raw_response = p_raw_response, updated_at = now()
  where id = p_payment_id;

  update public.artists
  set credit_balance = greatest(0, coalesce(credit_balance, 0) - v_credit_usd)
  where id = v_payment.user_id
  returning coalesce(credit_balance, 0) into v_new_balance;
  if not found then raise exception 'Artist account not found'; end if;

  insert into public.credit_transactions (artist_id, amount, type, description)
  values (v_payment.user_id, least(v_credit_usd, greatest(0, coalesce(v_payment.amount_usd, 0))),
          'credit_paid', 'Outstanding account credit paid via Flutterwave (reference: ' || v_payment.flutterwave_tx_ref || ')');
  return v_new_balance;
end;
$$;
revoke all on function public.settle_credit_balance_payment(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.settle_credit_balance_payment(uuid, text, text, jsonb) to service_role;
