create or replace function public.process_manual_payment_renewal(
  p_user_id uuid,
  p_plan_id uuid,
  p_receipt_reference text,
  p_amount_received_ngn numeric,
  p_subscription_fee_ngn numeric,
  p_payment_method text,
  p_admin_user_id uuid,
  p_duration_days integer,
  p_email text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_end timestamptz;
  v_extra numeric(12,2);
  v_payment_id uuid;
  v_subscription_id uuid;
  v_pending_id uuid;
  v_notification_id uuid;
  v_plan_name text;
  v_duplicate_count integer := 0;
  v_meta jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if exists (select 1 from public.payments where flutterwave_tx_ref = p_receipt_reference) then
    raise exception using errcode = '23505', message = 'Receipt reference already exists';
  end if;

  select name into v_plan_name from public.plans where id = p_plan_id;
  if v_plan_name is null then
    raise exception 'Selected plan does not exist';
  end if;

  v_end := v_now + make_interval(days => p_duration_days);
  v_extra := round(p_amount_received_ngn - p_subscription_fee_ngn, 2);
  v_meta := jsonb_build_object(
    'manual_confirmation', true,
    'confirmed_by_admin_user_id', p_admin_user_id,
    'amount_received_ngn', p_amount_received_ngn,
    'subscription_fee_ngn', p_subscription_fee_ngn,
    'unapplied_difference_ngn', v_extra,
    'duration_days', p_duration_days,
    'receipt_reference', p_receipt_reference,
    'payment_channel', p_payment_method,
    'processed_at', v_now
  );

  select id into v_pending_id
  from public.payments
  where user_id = p_user_id and status = 'pending'
    and raw_response @> '{"checkout_meta":{"is_renewal":true}}'::jsonb
  order by created_at desc
  limit 1
  for update;

  if v_pending_id is not null then
    update public.payments set
      plan_id = p_plan_id,
      flutterwave_tx_ref = p_receipt_reference,
      amount_usd = 0,
      amount_charged = p_amount_received_ngn,
      currency = 'NGN',
      payment_method = p_payment_method || ' (manual confirmation)',
      status = 'successful',
      customer_email = p_email,
      raw_response = v_meta,
      updated_at = v_now
    where id = v_pending_id;
    v_payment_id := v_pending_id;
  else
    insert into public.payments (
      user_id, plan_id, flutterwave_tx_ref, amount_usd, amount_charged,
      currency, payment_method, status, customer_email, raw_response
    ) values (
      p_user_id, p_plan_id, p_receipt_reference, 0, p_amount_received_ngn,
      'NGN', p_payment_method || ' (manual confirmation)', 'successful',
      p_email, v_meta
    ) returning id into v_payment_id;
  end if;

  update public.payments set
    status = 'failed',
    raw_response = jsonb_build_object(
      'reconciled_duplicate', true,
      'reconciled_into', p_receipt_reference,
      'reconciled_at', v_now
    ),
    updated_at = v_now
  where user_id = p_user_id and status = 'pending'
    and raw_response @> '{"checkout_meta":{"is_renewal":true}}'::jsonb
    and id <> v_payment_id;
  get diagnostics v_duplicate_count = row_count;

  select id into v_subscription_id
  from public.subscriptions
  where user_id = p_user_id
  order by end_date desc
  limit 1
  for update;

  if v_subscription_id is null then
    insert into public.subscriptions (
      user_id, plan_id, status, start_date, end_date, last_payment_id,
      updated_at, auto_renew
    ) values (
      p_user_id, p_plan_id, 'active', v_now, v_end, v_payment_id, v_now, false
    ) returning id into v_subscription_id;
  else
    update public.subscriptions set
      plan_id = p_plan_id, status = 'active', start_date = v_now,
      end_date = v_end, last_payment_id = v_payment_id, updated_at = v_now,
      auto_renew = false
    where id = v_subscription_id;
  end if;

  insert into public.subscribers (
    user_id, email, subscribed, subscription_tier, subscription_end, updated_at
  ) values (
    p_user_id, p_email, true, v_plan_name, v_end, v_now
  )
  on conflict (email) do update set
    user_id = excluded.user_id, subscribed = true,
    subscription_tier = excluded.subscription_tier,
    subscription_end = excluded.subscription_end, updated_at = excluded.updated_at;

  insert into public.notifications (
    user_id, type, title, message, link, metadata, read
  ) values (
    p_user_id, 'payment', 'Payment received — subscription activated',
    format('Your %s-day MALPINOHdistro subscription renewal is active. Amount received: ₦%s; subscription fee: ₦%s; difference not applied: ₦%s.',
      p_duration_days, to_char(p_amount_received_ngn, 'FM999999999990.00'),
      to_char(p_subscription_fee_ngn, 'FM999999999990.00'), to_char(v_extra, 'FM999999999990.00')),
    '/billing',
    jsonb_build_object(
      'receipt_reference', p_receipt_reference, 'payment_id', v_payment_id,
      'duration_days', p_duration_days, 'amount_received_ngn', p_amount_received_ngn,
      'subscription_fee_ngn', p_subscription_fee_ngn, 'unapplied_difference_ngn', v_extra
    ), false
  ) returning id into v_notification_id;

  return jsonb_build_object(
    'payment_id', v_payment_id, 'subscription_id', v_subscription_id,
    'notification_id', v_notification_id, 'subscription_start', v_now,
    'subscription_end', v_end, 'plan_name', v_plan_name,
    'duplicate_pending_attempts_reconciled', v_duplicate_count,
    'unapplied_difference_ngn', v_extra
  );
end;
$$;

revoke all on function public.process_manual_payment_renewal(uuid, uuid, text, numeric, numeric, text, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.process_manual_payment_renewal(uuid, uuid, text, numeric, numeric, text, uuid, integer, text) to service_role;
