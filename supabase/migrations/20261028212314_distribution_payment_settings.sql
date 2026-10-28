create table if not exists public.distribution_payment_settings (
  id boolean primary key default true check (id = true),
  bank_name text not null default '',
  account_name text not null default '',
  account_number text not null default '',
  transfer_instructions text not null default '',
  updated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.distribution_payment_settings(id) values(true) on conflict(id) do nothing;
alter table public.distribution_payment_settings enable row level security;
create policy "Authenticated users can view distribution bank details"
on public.distribution_payment_settings for select to authenticated using (true);
revoke insert, update, delete on public.distribution_payment_settings from anon, authenticated;
