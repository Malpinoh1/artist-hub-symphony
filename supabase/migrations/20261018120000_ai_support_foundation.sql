-- AI support foundation for MALPINOHdistro.
-- This migration is additive and reuses the existing support_tickets workflow.

create table if not exists public.ai_support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New support conversation',
  status text not null default 'open'
    check (status in ('open', 'closed', 'escalated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_support_conversations_user_updated_idx
  on public.ai_support_conversations (user_id, updated_at desc);

create table if not exists public.ai_support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.ai_support_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 12000),
  created_at timestamptz not null default now()
);

create index if not exists ai_support_messages_conversation_created_idx
  on public.ai_support_messages (conversation_id, created_at);

create table if not exists public.ai_support_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'general',
  body text not null,
  source_url text,
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ai_support_conversations enable row level security;
alter table public.ai_support_messages enable row level security;
alter table public.ai_support_articles enable row level security;

drop policy if exists "Users can read own AI support conversations" on public.ai_support_conversations;
create policy "Users can read own AI support conversations"
  on public.ai_support_conversations
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can update own AI support conversations" on public.ai_support_conversations;
create policy "Users can update own AI support conversations"
  on public.ai_support_conversations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read messages in own AI support conversations" on public.ai_support_messages;
create policy "Users can read messages in own AI support conversations"
  on public.ai_support_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.ai_support_conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Authenticated users can read published AI support articles" on public.ai_support_articles;
create policy "Authenticated users can read published AI support articles"
  on public.ai_support_articles
  for select to authenticated
  using (published = true);

grant select on public.ai_support_conversations to authenticated;
grant update (title, status, updated_at) on public.ai_support_conversations to authenticated;
grant select on public.ai_support_messages to authenticated;
grant select on public.ai_support_articles to authenticated;

insert into public.ai_support_articles (slug, title, category, body, source_url, published)
values
  (
    'prepare-audio',
    'Preparing audio for distribution',
    'releases',
    'The MALPINOHdistro Help Center currently advises WAV audio at 16-bit, 44.1 kHz. Confirm the current requirements shown in the release form before uploading, because requirements may change.',
    '/help',
    true
  ),
  (
    'cover-artwork',
    'Cover artwork requirements',
    'releases',
    'The MALPINOHdistro Help Center currently advises square JPEG or PNG cover artwork, at least 3000 by 3000 pixels. Confirm the requirements shown in the release form before uploading, because requirements may change.',
    '/help',
    true
  ),
  (
    'release-processing',
    'Release processing times',
    'releases',
    'The MALPINOHdistro Help Center states that music processing can vary by subscription plan and platform, with a general estimate of 15–60 days. This is an estimate, not a guarantee. For a specific release, contact support and include its release ID.',
    '/help',
    true
  ),
  (
    'withdraw-earnings',
    'Withdrawing earnings',
    'billing',
    'The MALPINOHdistro Help Center directs users to the Earnings dashboard to request a withdrawal. Do not share bank details in the AI chat; use the platform’s secure withdrawal workflow.',
    '/help',
    true
  ),
  (
    'release-metadata-changes',
    'Changing release metadata or audio',
    'releases',
    'The MALPINOHdistro Help Center says some metadata may be updated after release. Audio file changes may require a new release. Contact support for guidance on a specific release before making changes.',
    '/help',
    true
  )
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  body = excluded.body,
  source_url = excluded.source_url,
  published = excluded.published,
  updated_at = now();
