

## Performance & Platform Upgrade Plan

### Issues Identified

**1. N+1 Query in AccountContext (Major Slowdown)**
`AccountContext.tsx` lines 82-99: For each team account, a separate Supabase query fetches artist data in a `for` loop. This is an N+1 query pattern that causes sequential network requests.

**2. Duplicate Subscription/Permission Checks**
Every dashboard page triggers independent chains:
- `AuthContext` → `getSession()`
- `useSubscriptionCheck` → `user_is_admin` RPC + `subscribers` query
- `useTeamPermissions` → `account_access` query
- `AccountContext` → `account_access` + N artist queries
- Page-level components (Dashboard, Earnings, Releases) each call `supabase.auth.getSession()` again

This means 5-8+ Supabase calls fire on every page load before any content renders.

**3. No React Query Caching**
Despite `@tanstack/react-query` being installed, no dashboard data fetching uses it. Every navigation triggers fresh fetches with no caching, stale-while-revalidate, or deduplication.

**4. SubscriptionGate renders Navbar/Footer inside DashboardLayout**
`SubscriptionGate.tsx` renders its own `<Navbar />` and `<Footer />` in fallback states, but it's already wrapped inside `DashboardLayout`. This creates duplicate navigation if the gate triggers.

**5. Eager Loading of All Pages**
`App.tsx` imports every page eagerly — no code splitting. The initial bundle includes Admin, all marketing pages, and all dashboard pages.

---

### Plan

#### Task 1: Add React Query for Data Fetching
- Configure `QueryClient` with sensible defaults (`staleTime: 5min`, `gcTime: 10min`)
- Create custom hooks:
  - `useUserProfile(userId)` — cached profile fetch
  - `useArtistData(accountId)` — cached artist data
  - `useEarningsData(artistId)` — cached earnings
  - `useReleasesData(accountId)` — cached releases
- Replace raw `supabase` calls in `Dashboard.tsx`, `Earnings.tsx`, `Releases.tsx`, `Analytics.tsx` with these hooks
- This provides automatic deduplication, background refetch, and caching across navigation

#### Task 2: Fix N+1 Query in AccountContext
- Replace the `for` loop in `fetchTeamAccounts` with a single query using `.in('id', ownerIds)` to batch-fetch all artist records
- This reduces N+1 sequential requests to 2 parallel requests

#### Task 3: Add Route-Level Code Splitting
- Convert all page imports in `App.tsx` to `React.lazy()` with `Suspense`
- Group critical routes (Dashboard, Releases) vs. less-used routes (Admin, marketing pages)
- Add a shared loading fallback component

#### Task 4: Fix SubscriptionGate Rendering
- Remove `<Navbar />` and `<Footer />` from `SubscriptionGate` fallback states since it's rendered inside `DashboardLayout`
- Use a simpler card-based fallback that fits within the dashboard content area

#### Task 5: Deduplicate Auth/Session Checks
- Remove redundant `supabase.auth.getSession()` calls from `Earnings.tsx` (line 51) and `Releases.tsx` — use `useAuth()` hook's `user` instead, which is already available
- Ensure `useSubscriptionCheck` result is shared via context rather than re-instantiated per component (it's called independently in `useTeamPermissions` AND `SubscriptionGuard`)

#### Task 6: Add Supabase Query Caching Headers
- Add runtime caching rule in the PWA config for Supabase REST API calls (`StaleWhileRevalidate` with short TTL) so repeat visits serve cached data while refreshing in background

---

### Impact Summary
- Reduces initial page load Supabase calls from ~8 to ~3 (auth + subscription + page data)
- Adds client-side caching so navigation between dashboard pages is instant
- Cuts JS bundle size via code splitting
- Fixes visual bugs from duplicate nav rendering in gate components

