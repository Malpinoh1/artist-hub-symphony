alter table public.distribution_invoices drop constraint if exists distribution_invoices_check1;
alter table public.distribution_invoices add constraint distribution_invoices_release_exception_check check (release_id is not null or allow_release_before_full_payment = false or true);
alter table public.distribution_invoices add column if not exists release_authorized_at timestamptz null;
alter table public.distribution_invoices add column if not exists release_claim_txid bigint null;

create or replace function public.check_release_submission_allowed(uid uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare v_cutoff timestamptz; v_has_prior boolean; v_active_sub boolean; v_credit_id uuid; v_invoice_id uuid;
begin
 if public.user_has_distribution_role(uid) then return jsonb_build_object('allowed',true,'reason','admin'); end if;
 select cutoff_at into v_cutoff from public.release_gate_config limit 1;
 select exists(select 1 from public.releases r where r.artist_id=uid and r.created_at<v_cutoff) into v_has_prior;
 if v_has_prior then return jsonb_build_object('allowed',true,'reason','grandfathered'); end if;
 select exists(select 1 from public.subscriptions s where s.user_id=uid and s.status='active' and s.end_date>now()) into v_active_sub;
 if v_active_sub then return jsonb_build_object('allowed',true,'reason','subscription'); end if;
 if exists(select 1 from public.subscribers sb where sb.user_id=uid and sb.subscribed=true and (sb.subscription_end is null or sb.subscription_end>now())) then return jsonb_build_object('allowed',true,'reason','subscription'); end if;
 select id into v_credit_id from public.release_credits where user_id=uid and status='available' order by created_at limit 1;
 if v_credit_id is not null then return jsonb_build_object('allowed',true,'reason','credit','credit_id',v_credit_id); end if;
 select id into v_invoice_id from public.distribution_invoices
 where billing_account_id=uid and release_id is null and release_authorized_at is null
 and status in ('paid','issued','partially_paid','overdue')
 and (status='paid' or allow_release_before_full_payment=true)
 order by created_at asc limit 1;
 if v_invoice_id is not null then return jsonb_build_object('allowed',true,'reason','distribution_invoice','invoice_id',v_invoice_id); end if;
 return jsonb_build_object('allowed',false,'reason','payment_required');
end; $function$;

create or replace function public.enforce_release_submission_gate()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_result jsonb; v_credit_id uuid; v_invoice_id uuid; v_claimed integer;
begin
 if public.user_has_distribution_role() then return NEW; end if;
 v_result:=public.check_release_submission_allowed(NEW.artist_id);
 if coalesce((v_result->>'allowed')::boolean,false)=false then
  raise exception 'Release submission requires payment. Pay the distribution invoice, choose Pay-Per-Release, or subscribe.' using errcode='check_violation';
 end if;
 if v_result->>'reason'='credit' then
  v_credit_id:=(v_result->>'credit_id')::uuid;
  update public.release_credits set status='used',consumed_at=now(),consumed_release_id=NEW.id where id=v_credit_id and status='available';
  get diagnostics v_claimed=row_count;
  if v_claimed=0 then raise exception 'Release credit was already consumed; retry submission' using errcode='check_violation'; end if;
 elsif v_result->>'reason'='distribution_invoice' then
  v_invoice_id:=(v_result->>'invoice_id')::uuid;
  update public.distribution_invoices set release_authorized_at=now(),release_claim_txid=txid_current(),updated_at=now()
  where id=v_invoice_id and release_authorized_at is null and release_id is null
   and (status='paid' or (allow_release_before_full_payment=true and status in ('issued','partially_paid','overdue')));
  get diagnostics v_claimed=row_count;
  if v_claimed=0 then raise exception 'Distribution invoice exception was already used; retry submission' using errcode='check_violation'; end if;
 end if;
 return NEW;
end; $function$;

create or replace function public.attach_distribution_invoice_to_release()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
 update public.distribution_invoices set release_id=NEW.id,release_claim_txid=null,updated_at=now()
 where billing_account_id=NEW.artist_id and release_claim_txid=txid_current()
  and release_authorized_at is not null and release_id is null;
 return NEW;
end; $function$;
drop trigger if exists attach_distribution_invoice_to_release on public.releases;
create trigger attach_distribution_invoice_to_release after insert on public.releases
for each row execute function public.attach_distribution_invoice_to_release();

create or replace function public.create_distribution_invoice(
 p_billing_account_id uuid,p_release_id uuid,p_description text,p_total_amount numeric,p_due_at timestamptz,
 p_internal_notes text,p_created_by uuid,p_issue_now boolean,p_allow_release_before_full_payment boolean
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_invoice public.distribution_invoices%rowtype; v_email text; v_role_ok boolean;
begin
 select exists(select 1 from public.user_roles where user_id=p_created_by and role in ('admin','finance_manager','distribution_manager')) into v_role_ok;
 if not v_role_ok then raise exception 'Invoice management permission required' using errcode='42501'; end if;
 if p_total_amount is null or p_total_amount<=0 or p_total_amount<>trunc(p_total_amount) then raise exception 'Invoice amount must be a positive whole number of NGN' using errcode='22023'; end if;
 if p_description is null or length(trim(p_description))=0 then raise exception 'Invoice description is required' using errcode='22023'; end if;
 if not exists(select 1 from public.artists where id=p_billing_account_id) then raise exception 'Billing account not found' using errcode='P0002'; end if;
 if p_release_id is not null and not exists(select 1 from public.releases r left join public.artist_accounts aa on aa.id=r.artist_account_id where r.id=p_release_id and (r.artist_id=p_billing_account_id or aa.owner_id=p_billing_account_id)) then raise exception 'Release does not belong to the selected billing account' using errcode='23514'; end if;
 insert into public.distribution_invoices(billing_account_id,release_id,description,total_amount,status,allow_release_before_full_payment,due_at,issued_at,internal_notes,created_by)
 values(p_billing_account_id,p_release_id,trim(p_description),p_total_amount,case when p_issue_now then 'issued' else 'draft' end,p_allow_release_before_full_payment,p_due_at,case when p_issue_now then now() else null end,nullif(trim(coalesce(p_internal_notes,'')),''),p_created_by)
 returning * into v_invoice;
 if p_issue_now then
  insert into public.distribution_account_ledger(billing_account_id,invoice_id,entry_type,amount_delta,description,created_by) values(v_invoice.billing_account_id,v_invoice.id,'invoice_charge',v_invoice.total_amount,'Distribution invoice issued: '||v_invoice.invoice_number,p_created_by);
  select email into v_email from public.artists where id=p_billing_account_id;
  insert into public.billing_notification_outbox(notification_type,invoice_id,recipient_email) values('invoice_issued',v_invoice.id,v_email);
 end if;
 return jsonb_build_object('success',true,'invoice_id',v_invoice.id,'invoice_number',v_invoice.invoice_number,'billing_account_id',v_invoice.billing_account_id,'release_id',v_invoice.release_id,'description',v_invoice.description,'total_amount',v_invoice.total_amount,'amount_paid',v_invoice.amount_paid,'amount_due',v_invoice.amount_due,'status',v_invoice.status,'issued_at',v_invoice.issued_at);
end; $$;
revoke all on function public.create_distribution_invoice(uuid,uuid,text,numeric,timestamptz,text,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.create_distribution_invoice(uuid,uuid,text,numeric,timestamptz,text,uuid,boolean,boolean) to service_role;
