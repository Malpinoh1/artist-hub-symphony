-- Login security alerts: server-side event history and single-use report links.
create table if not exists public.login_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  ip_address inet,
  city text,
  region text,
  country text,
  device_type text not null default 'Unknown',
  browser text,
  platform text not null default 'web' check (platform in ('web','app')),
  user_agent text,
  report_token_hash text unique,
  reported_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.login_security_events enable row level security;
revoke all on public.login_security_events from anon, authenticated;
grant select on public.login_security_events to authenticated;

drop policy if exists "Users can read their own login security events" on public.login_security_events;
create policy "Users can read their own login security events"
  on public.login_security_events for select to authenticated
  using (user_id = (select auth.uid()));

comment on table public.login_security_events is
  'Security audit events for successful MALPINOHdistro sign-ins. Location is IP-derived and approximate; report tokens are stored as SHA-256 hashes.';
