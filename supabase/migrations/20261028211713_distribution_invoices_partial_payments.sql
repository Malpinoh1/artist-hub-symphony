create sequence if not exists public.distribution_invoice_number_seq;

create table if not exists public.distribution_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default (
    'MPD-INV-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' ||
    lpad(nextval('public.distribution_invoice_number_seq')::text, 6, '0')
  ),
  billing_account_id uuid not null references public.artists(id) on delete restrict,
  release_id uuid null references public.releases(id) on delete restrict,
  description text not null,
  currency text not null default 'NGN' check (currency = 'NGN'),
  total_amount numeric(12,2) not null check (total_amount > 0 and total_amount = trunc(total_amount)),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0 and amount_paid = trunc(amount_paid)),
  amount_due numeric(12,2) generated always as (total_amount - amount_paid) stored,
  status text not null default 'draft' check (status in ('draft','issued','partially_paid','paid','overdue','cancelled')),
  allow_release_before_full_payment boolean not null default false,
  release_exception_scope text not null default 'single_release' check (release_exception_scope in ('single_release')),
  due_at timestamptz null,
  issued_at timestamptz null,
  internal_notes text null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid <= total_amount),
  check (release_id is not null or allow_release_before_full_payment = false)
);

create table if not exists public.distribution_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.distribution_invoices(id) on delete restrict,
  billing_account_id uuid not null references public.artists(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0 and amount = trunc(amount)),
  currency text not null default 'NGN' check (currency = 'NGN'),
  method text not null check (method in ('bank_transfer','card','other')),
  status text not null default 'pending_verification' check (status in ('pending_verification','confirmed','rejected','reversed')),
  transaction_reference text null,
  provider_reference text null,
  note text null,
  idempotency_key text not null unique,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  confirmed_by uuid null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (method, provider_reference)
);

create table if not exists public.distribution_account_ledger (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references public.artists(id) on delete restrict,
  invoice_id uuid not null references public.distribution_invoices(id) on delete restrict,
  payment_id uuid null references public.distribution_payments(id) on delete restrict,
  entry_type text not null check (entry_type in ('invoice_charge','payment','adjustment','reversal')),
  amount_delta numeric(12,2) not null check (amount_delta <> 0 and amount_delta = trunc(amount_delta)),
  currency text not null default 'NGN' check (currency = 'NGN'),
  description text not null,
  created_by uuid null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (payment_id, entry_type)
);

create table if not exists public.distribution_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  payment_id uuid not null unique references public.distribution_payments(id) on delete restrict,
  invoice_id uuid not null references public.distribution_invoices(id) on delete restrict,
  billing_account_id uuid not null references public.artists(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  total_invoice_amount numeric(12,2) not null,
  total_paid_after_payment numeric(12,2) not null,
  remaining_balance numeric(12,2) not null,
  currency text not null default 'NGN' check (currency = 'NGN'),
  issued_at timestamptz not null default now()
);

create table if not exists public.billing_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null check (notification_type in ('invoice_issued','payment_receipt')),
  invoice_id uuid not null references public.distribution_invoices(id) on delete restrict,
  payment_id uuid null references public.distribution_payments(id) on delete restrict,
  receipt_id uuid null references public.distribution_receipts(id) on delete restrict,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_type, payment_id),
  check ((notification_type = 'payment_receipt' and payment_id is not null and receipt_id is not null)
      or (notification_type = 'invoice_issued' and payment_id is null))
);

create index if not exists distribution_invoices_account_status_idx on public.distribution_invoices (billing_account_id, status, created_at desc);
create index if not exists distribution_payments_invoice_status_idx on public.distribution_payments (invoice_id, status, recorded_at desc);
create index if not exists distribution_ledger_account_created_idx on public.distribution_account_ledger (billing_account_id, created_at desc);
create index if not exists billing_outbox_pending_idx on public.billing_notification_outbox (status, created_at) where status in ('pending','failed');

alter table public.distribution_invoices enable row level security;
alter table public.distribution_payments enable row level security;
alter table public.distribution_account_ledger enable row level security;
alter table public.distribution_receipts enable row level security;
alter table public.billing_notification_outbox enable row level security;

create policy "Billing account members can read invoices" on public.distribution_invoices for select to authenticated
using (billing_account_id = (select auth.uid())
  or exists (select 1 from public.account_access aa where aa.account_owner_id = distribution_invoices.billing_account_id and aa.user_id = (select auth.uid()))
  or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','finance_manager','distribution_manager')));

create policy "Billing account members can read payments" on public.distribution_payments for select to authenticated
using (billing_account_id = (select auth.uid())
  or exists (select 1 from public.account_access aa where aa.account_owner_id = distribution_payments.billing_account_id and aa.user_id = (select auth.uid()))
  or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','finance_manager','distribution_manager')));

create policy "Billing account members can read ledger" on public.distribution_account_ledger for select to authenticated
using (billing_account_id = (select auth.uid())
  or exists (select 1 from public.account_access aa where aa.account_owner_id = distribution_account_ledger.billing_account_id and aa.user_id = (select auth.uid()))
  or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','finance_manager','distribution_manager')));

create policy "Billing account members can read receipts" on public.distribution_receipts for select to authenticated
using (billing_account_id = (select auth.uid())
  or exists (select 1 from public.account_access aa where aa.account_owner_id = distribution_receipts.billing_account_id and aa.user_id = (select auth.uid()))
  or exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','finance_manager','distribution_manager')));

create policy "Admins can read billing outbox" on public.billing_notification_outbox for select to authenticated
using (exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.role in ('admin','finance_manager')));

revoke insert, update, delete on public.distribution_invoices from anon, authenticated;
revoke insert, update, delete on public.distribution_payments from anon, authenticated;
revoke insert, update, delete on public.distribution_account_ledger from anon, authenticated;
revoke insert, update, delete on public.distribution_receipts from anon, authenticated;
revoke insert, update, delete on public.billing_notification_outbox from anon, authenticated;

create or replace function public.confirm_distribution_payment(p_payment_id uuid, p_admin_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  v_payment public.distribution_payments%rowtype;
  v_invoice public.distribution_invoices%rowtype;
  v_receipt_id uuid;
  v_receipt_number text;
  v_email text;
  v_name text;
begin
  if not exists (select 1 from public.user_roles where user_id = p_admin_user_id and role in ('admin','finance_manager')) then
    raise exception 'Finance admin privileges required' using errcode = '42501';
  end if;
  select * into v_payment from public.distribution_payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found' using errcode = 'P0002'; end if;
  if v_payment.status = 'confirmed' then
    select id, receipt_number into v_receipt_id, v_receipt_number from public.distribution_receipts where payment_id = p_payment_id;
    select * into v_invoice from public.distribution_invoices where id = v_payment.invoice_id;
    return jsonb_build_object('success',true,'already_confirmed',true,'payment_id',p_payment_id,'receipt_id',v_receipt_id,'receipt_number',v_receipt_number,'invoice_total',v_invoice.total_amount,'amount_paid',v_invoice.amount_paid,'amount_due',v_invoice.amount_due,'invoice_status',v_invoice.status);
  end if;
  if v_payment.status <> 'pending_verification' then raise exception 'Only pending payments can be confirmed' using errcode = '22023'; end if;
  select * into v_invoice from public.distribution_invoices where id = v_payment.invoice_id for update;
  if not found then raise exception 'Invoice not found' using errcode = 'P0002'; end if;
  if v_invoice.status = 'cancelled' then raise exception 'Cancelled invoices cannot accept payments' using errcode = '22023'; end if;
  if v_payment.billing_account_id <> v_invoice.billing_account_id then raise exception 'Payment account does not match invoice account' using errcode = '23514'; end if;
  if v_payment.amount > v_invoice.amount_due then raise exception 'Payment exceeds outstanding invoice balance' using errcode = '22023'; end if;
  update public.distribution_payments set status='confirmed', confirmed_by=p_admin_user_id, confirmed_at=now() where id=p_payment_id;
  insert into public.distribution_account_ledger(billing_account_id,invoice_id,payment_id,entry_type,amount_delta,description,created_by)
    values(v_invoice.billing_account_id,v_invoice.id,p_payment_id,'payment',-v_payment.amount,'Confirmed distribution invoice payment',p_admin_user_id)
    on conflict(payment_id,entry_type) do nothing;
  update public.distribution_invoices set amount_paid=v_invoice.amount_paid+v_payment.amount,
    status=case when v_invoice.total_amount-(v_invoice.amount_paid+v_payment.amount)=0 then 'paid' else 'partially_paid' end,
    updated_at=now() where id=v_invoice.id returning * into v_invoice;
  select email,name into v_email,v_name from public.artists where id=v_invoice.billing_account_id;
  v_receipt_number := 'MPD-RCP-' || to_char(now() at time zone 'UTC','YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.distribution_receipts(receipt_number,payment_id,invoice_id,billing_account_id,amount,total_invoice_amount,total_paid_after_payment,remaining_balance)
    values(v_receipt_number,p_payment_id,v_invoice.id,v_invoice.billing_account_id,v_payment.amount,v_invoice.total_amount,v_invoice.amount_paid,v_invoice.amount_due)
    returning id into v_receipt_id;
  insert into public.billing_notification_outbox(notification_type,invoice_id,payment_id,receipt_id,recipient_email)
    values('payment_receipt',v_invoice.id,p_payment_id,v_receipt_id,v_email) on conflict(notification_type,payment_id) do nothing;
  return jsonb_build_object('success',true,'already_confirmed',false,'payment_id',p_payment_id,'receipt_id',v_receipt_id,'receipt_number',v_receipt_number,'billing_account_id',v_invoice.billing_account_id,'customer_name',v_name,'recipient_email',v_email,'invoice_total',v_invoice.total_amount,'payment_amount',v_payment.amount,'amount_paid',v_invoice.amount_paid,'amount_due',v_invoice.amount_due,'invoice_status',v_invoice.status);
end; $$;
revoke all on function public.confirm_distribution_payment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.confirm_distribution_payment(uuid,uuid) to service_role;
