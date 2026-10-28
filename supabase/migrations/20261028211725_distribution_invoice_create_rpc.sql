create or replace function public.create_distribution_invoice(
 p_billing_account_id uuid,p_release_id uuid,p_description text,p_total_amount numeric,p_due_at timestamptz,
 p_internal_notes text,p_created_by uuid,p_issue_now boolean,p_allow_release_before_full_payment boolean
) returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare v_invoice public.distribution_invoices%rowtype; v_email text; v_role_ok boolean;
begin
 select exists(select 1 from public.user_roles where user_id=p_created_by and role in ('admin','finance_manager','distribution_manager')) into v_role_ok;
 if not v_role_ok then raise exception 'Invoice management permission required' using errcode='42501'; end if;
 if p_total_amount is null or p_total_amount<=0 or p_total_amount<>trunc(p_total_amount) then raise exception 'Invoice amount must be a positive whole number of NGN' using errcode='22023'; end if;
 if p_description is null or length(trim(p_description))=0 then raise exception 'Invoice description is required' using errcode='22023'; end if;
 if not exists(select 1 from public.artists where id=p_billing_account_id) then raise exception 'Billing account not found' using errcode='P0002'; end if;
 if p_release_id is not null and not exists(select 1 from public.releases r left join public.artist_accounts aa on aa.id=r.artist_account_id where r.id=p_release_id and (r.artist_id=p_billing_account_id or aa.owner_id=p_billing_account_id)) then raise exception 'Release does not belong to the selected billing account' using errcode='23514'; end if;
 if p_allow_release_before_full_payment and p_release_id is null then raise exception 'A release must be selected for a release exception' using errcode='22023'; end if;
 insert into public.distribution_invoices(billing_account_id,release_id,description,total_amount,status,allow_release_before_full_payment,due_at,issued_at,internal_notes,created_by)
 values(p_billing_account_id,p_release_id,trim(p_description),p_total_amount,case when p_issue_now then 'issued' else 'draft' end,p_allow_release_before_full_payment,p_due_at,case when p_issue_now then now() else null end,nullif(trim(coalesce(p_internal_notes,'')),''),p_created_by)
 returning * into v_invoice;
 if p_issue_now then
  insert into public.distribution_account_ledger(billing_account_id,invoice_id,entry_type,amount_delta,description,created_by)
  values(v_invoice.billing_account_id,v_invoice.id,'invoice_charge',v_invoice.total_amount,'Distribution invoice issued: '||v_invoice.invoice_number,p_created_by);
  select email into v_email from public.artists where id=p_billing_account_id;
  insert into public.billing_notification_outbox(notification_type,invoice_id,recipient_email) values('invoice_issued',v_invoice.id,v_email);
 end if;
 return jsonb_build_object('success',true,'invoice_id',v_invoice.id,'invoice_number',v_invoice.invoice_number,'billing_account_id',v_invoice.billing_account_id,'release_id',v_invoice.release_id,'description',v_invoice.description,'total_amount',v_invoice.total_amount,'amount_paid',v_invoice.amount_paid,'amount_due',v_invoice.amount_due,'status',v_invoice.status,'issued_at',v_invoice.issued_at);
end; $$;
revoke all on function public.create_distribution_invoice(uuid,uuid,text,numeric,timestamptz,text,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.create_distribution_invoice(uuid,uuid,text,numeric,timestamptz,text,uuid,boolean,boolean) to service_role;
