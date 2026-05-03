## Fixes Plan

### 1. Royalty Split — "No tracks found"
**Root cause:** `CreateRoyaltySplitForm.tsx` filters tracks by `release_id AND primary_artist_id = user.id`. When the active session is on a team/sub-account (AccountContext), or when a release was created by an admin on behalf of an artist, `primary_artist_id` may differ from `user.id`, returning 0 rows even though tracks exist. Same bug also restricts the release list to `artist_id = user.id`.

**Fix in `src/components/CreateRoyaltySplitForm.tsx`:**
- Use `currentAccountId` from `useAccount()` instead of `user.id` for the releases query (`releases.artist_id = currentAccountId`).
- For tracks, query by `release_id` only and drop the `primary_artist_id` filter (RLS already restricts visibility). Same for the auto-create fallback.
- When auto-creating from `release_tracks`, set `primary_artist_id = release.artist_id` (fetched once), not `user.id`.

### 2. 2FA — "Cannot enable/setup"
**Root cause:** The `profiles` table uses `id = gen_random_uuid()` and a separate `user_id` column (per `handle_new_user`). The 2FA edge functions match/upsert on `id = user.id`, which only works for legacy rows where the two happen to coincide. New users silently get 0-row updates, and the `enable-2fa` upsert with `onConflict: 'id'` collides with the unique `user_id` constraint.

**Fix in edge functions** `setup-2fa`, `enable-2fa`, `verify-2fa`, `disable-2fa`:
- Replace every `.eq('id', user.id)` with `.eq('user_id', user.id)`.
- Change `enable-2fa` upsert to `onConflict: 'user_id'` and use `user_id: user.id` (let `id` default), select `.maybeSingle()`.
- Add explicit error responses when no profile row exists so the UI surfaces a real message instead of generic failure.

### 3. USD ↔ NGN exchange rate (Google-aligned, daily refresh)
Replace the hardcoded `EXCHANGE_RATE = 1250` constant in 3 files with a live, cached rate.

**Database (migration):**
```sql
create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base text not null default 'USD',
  quote text not null default 'NGN',
  rate numeric not null,
  source text not null default 'exchangerate.host',
  fetched_at timestamptz not null default now()
);
alter table public.exchange_rates enable row level security;
create policy "Anyone authenticated can read fx" on public.exchange_rates
  for select using (auth.uid() is not null);
create policy "Admins manage fx" on public.exchange_rates
  for all using (user_is_admin()) with check (user_is_admin());
create index on public.exchange_rates (base, quote, fetched_at desc);
```

**Edge function `fetch-exchange-rate`:**
- Fetches `https://api.exchangerate.host/latest?base=USD&symbols=NGN` (free, no key, tracks Google/market mid-rate within ~0.5%).
- Inserts a new row into `exchange_rates`. Returns `{ rate, fetched_at }`.
- Schedule with `pg_cron` daily at 02:00 UTC via `pg_net` (insert via Supabase insert tool, not migration, to keep the URL+anon key out of source).

**Frontend hook `src/hooks/useExchangeRate.ts`:**
- On mount, `select rate from exchange_rates order by fetched_at desc limit 1`.
- If the latest row is >24 h old (or none), invoke `fetch-exchange-rate` then re-select.
- Cache in React Query / module-level state so all components share one value.
- Returns `{ rate, isLoading, refresh() }`. Falls back to 1250 if the API/table is unreachable, so withdrawals never break.

**Replace hardcoded constant in:**
- `src/components/WithdrawalForm.tsx`
- `src/components/earnings/WithdrawalsTable.tsx`
- `src/components/admin/WithdrawalsTab.tsx`

Each: remove `const EXCHANGE_RATE = 1250`, call `useExchangeRate()`, use the live `rate`. Show a small "Rate: $1 = ₦X (updated <date>)" hint near the NGN amount so users see freshness.

**Memory update:** revise `mem://index.md` core rule from "Exchange rate: $1 = ₦1,250" to "Exchange rate: dynamic via `exchange_rates` table, refreshed daily from exchangerate.host; fallback ₦1,250."

### Files to create / edit
- Edit: `src/components/CreateRoyaltySplitForm.tsx`
- Edit: `supabase/functions/setup-2fa/index.ts`, `enable-2fa/index.ts`, `verify-2fa/index.ts`, `disable-2fa/index.ts`
- Create: `supabase/functions/fetch-exchange-rate/index.ts`
- Create: `src/hooks/useExchangeRate.ts`
- Edit: `src/components/WithdrawalForm.tsx`, `src/components/earnings/WithdrawalsTable.tsx`, `src/components/admin/WithdrawalsTab.tsx`
- Migration: create `exchange_rates` table + RLS
- Insert (non-migration): pg_cron schedule for daily fetch
- Update `mem://index.md`
