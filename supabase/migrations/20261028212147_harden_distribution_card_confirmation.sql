create or replace function public.confirm_distribution_card_payment(p_payment_id uuid,p_provider_reference text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_payment public.distribution_payments%rowtype; v_invoice public.distribution_invoices%rowtype; v_receipt_id uuid; v_receipt_number text; v_email text; v_name text;
begin
 select * into v_payment from public.distribution_payments where id=p_payment_id for update;
 if not found then raise exception 'Payment not found' using errcode='P0002'; end if;
 if v_payment.method<>'card' then raise exception 'Only card payments can be confirmed by provider verification' using errcode='22023'; end if;
 if v_payment.provider_reference is distinct from p_provider_reference then raise exception 'Provider reference does not match the pending payment' using errcode='23514'; end if;
 if v_payment.status='confirmed' then
  select id,receipt_number into v_receipt_id,v_receipt_number from public.distribution_receipts where payment_id=p_payment_id;
  select * into v_invoice from public.distribution_invoices where id=v_payment.invoice_id;
  return jsonb_build_object('success',true,'already_confirmed',true,'payment_id',p_payment_id,'receipt_id',v_receipt_id,'receipt_number',v_receipt_number,'invoice_id',v_invoice.id,'amount_due',v_invoice.amount_due,'invoice_status',v_invoice.status);
 end if;
 if v_payment.status<>'pending_verification' then raise exception 'Payment is not awaiting confirmation' using errcode='22023'; end if;
 if p_provider_reference is null or length(trim(p_provider_reference))=0 then raise exception 'Verified provider reference is required' using errcode='22023'; end if;
 select * into v_invoice from public.distribution_invoices where id=v_payment.invoice_id for update;
 if not found then raise exception 'Invoice not found' using errcode='P0002'; end if;
 if v_invoice.status='cancelled' then raise exception 'Cancelled invoice cannot accept payment' using errcode='22023'; end if;
 if v_payment.billing_account_id<>v_invoice.billing_account_id then raise exception 'Payment account does not match invoice account' using errcode='23514'; end if;
 if v_payment.amount>v_invoice.amount_due then raise exception 'Payment exceeds outstanding invoice balance' using errcode='22023'; end if;
 update public.distribution_payments set status='confirmed',transaction_reference=p_provider_reference,confirmed_at=now() where id=p_payment_id;
 insert into public.distribution_account_ledger(billing_account_id,invoice_id,payment_id,entry_type,amount_delta,description)
 values(v_invoice.billing_account_id,v_invoice.id,p_payment_id,'payment',-v_payment.amount,'Verified card payment') on conflict(payment_id,entry_type) do nothing;
 update public.distribution_invoices set amount_paid=amount_paid+v_payment.amount,status=case when total_amount-(amount_paid+v_payment.amount)=0 then 'paid' else 'partially_paid' end,updated_at=now()
 where id=v_invoice.id returning * into v_invoice;
 select email,name into v_email,v_name from public.artists where id=v_invoice.billing_account_id;
 v_receipt_number:='MPD-RCP-'||to_char(now() at time zone 'UTC','YYYY')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 insert into public.distribution_receipts(receipt_number,payment_id,invoice_id,billing_account_id,amount,total_invoice_amount,total_paid_after_payment,remaining_balance)
 values(v_receipt_number,p_payment_id,v_invoice.id,v_invoice.billing_account_id,v_payment.amount,v_invoice.total_amount,v_invoice.amount_paid,v_invoice.amount_due) returning id into v_receipt_id;
 insert into public.billing_notification_outbox(notification_type,invoice_id,payment_id,receipt_id,recipient_email)
 values('payment_receipt',v_invoice.id,p_payment_id,v_receipt_id,v_email) on conflict(notification_type,payment_id) do nothing;
 return jsonb_build_object('success',true,'already_confirmed',false,'payment_id',p_payment_id,'receipt_id',v_receipt_id,'receipt_number',v_receipt_number,'invoice_id',v_invoice.id,'customer_name',v_name,'recipient_email',v_email,'payment_amount',v_payment.amount,'invoice_total',v_invoice.total_amount,'amount_paid',v_invoice.amount_paid,'amount_due',v_invoice.amount_due,'invoice_status',v_invoice.status);
end; $$;
revoke all on function public.confirm_distribution_card_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_distribution_card_payment(uuid,text) to service_role;
