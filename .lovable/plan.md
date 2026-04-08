
## Track-Based Royalty & Income Management System

### Phase 1: Database Schema (Migration)

Create new tables:

**`tracks`** — Track registry
- `id`, `title`, `primary_artist_id` (references `artists.id`), `created_at`
- RLS: Admins full access, artists can view tracks they're associated with

**`income_platforms`** — Platform list (avoiding conflict with existing `platforms` column)
- `id`, `name`
- Seed: Spotify, Apple Music, Audiomack, Boomplay, YouTube Music, TikTok, Facebook/Instagram, Manual

**`royalty_splits`** — Per-track artist percentage splits
- `id`, `track_id`, `artist_id`, `percentage`
- Constraint: total per track must = 100 (enforced via trigger)

**`incomes`** — Income records per track + platform
- `id`, `track_id`, `platform_id`, `amount`, `description`, `reference` (unique), `date`, `created_by`, `created_at`
- RLS: Admin-only write, artists can view their own

**`income_transactions`** — Every financial movement (audit trail)
- `id`, `artist_id`, `track_id`, `platform_id`, `income_id`, `type` (income/royalty_share_in/royalty_share_out/withdrawal), `amount`, `balance_after`, `description`, `created_at`
- RLS: Admin full access, artists view own

**Database function: `process_income()`** — SECURITY DEFINER function that:
1. Inserts income record
2. Checks royalty_splits for the track
3. If no splits → 100% to primary artist
4. If splits exist → distribute by percentage
5. Creates transaction records for each share
6. Updates artist balances
7. All within a single transaction (atomic)

**Trigger on `royalty_splits`** — Validates total percentage per track = 100

### Phase 2: Edge Function — Income Email Notification

**`send-income-notification`** edge function:
- Called after income is processed
- Sends email to each artist who received income
- Uses existing Brevo email infrastructure
- Subject: "New Income Added to Your Account"

### Phase 3: Admin UI

**Admin Income Management** (`src/components/admin/IncomeManagementTab.tsx`):
- Add Income form: Select Artist → Select Track → Select Platform → Amount, Description, Date, Reference
- Income history table with filters
- Track management (create tracks, assign to artists)
- Royalty split editor per track (multi-artist percentage allocation)

### Phase 4: Artist Dashboard

**Transaction History Page** (`src/pages/Transactions.tsx`):
- Table: Date, Track, Platform, Description, Type, Amount, Balance
- Filters: by track, platform, date range
- Dashboard totals: Total Balance, Total Earnings, Total Withdrawn, Pending, Transaction Count
- All values calculated from `income_transactions` table

### Phase 5: Integration

- Add Transactions link to dashboard navigation
- Wire admin tab into AdminDashboard
- Add route for `/transactions`

### Security
- All write operations admin-only via RLS + `user_is_admin()`
- Artists read-only on their own data
- Balance derived from transactions (no manual editing)
- Unique constraint on income reference to prevent duplicates
- Database-level transaction ensures atomicity
