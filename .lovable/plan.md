## Plan: ONErpm CSV Royalty Ingestion & Self-Service Statements

Build a semi-automated royalty pipeline: Admin uploads ONErpm CSV → system parses, matches to artists by Account Name, aggregates per artist/month, credits balances, and lets artists download branded PDF statements anytime.

### How matching works (smart logic)

ONErpm's `Artists` field looks like:
```
Liolizzy (performer), LAWAL IBRAHIM (writer)
```
We extract `(performer)` names only (fallback: substring match against every artist's `account_name`). If multiple performers, earnings are split evenly across matched artists. Unmatched rows go to a review queue.

---

### 1. Database (new migration)

**`artists.account_name`** — new `text` column, unique (case-insensitive index). Backfilled from `artists.name`.

**`royalty_uploads`** — upload history
- `id`, `file_name`, `period_label` (e.g. "2025-09"), `period_start`, `period_end`, `uploaded_by`, `created_at`
- `total_rows`, `matched_rows`, `unmatched_rows`, `total_amount`, `currency`
- `status` (`processing` | `completed` | `failed`), `error_message`

**`royalty_upload_rows`** — every parsed CSV row (audit + reprocessing)
- `upload_id`, `track_title`, `raw_artists`, `performer_names text[]`, `track_external_id`, `quantity`, `net_amount`, `currency`, `sales_type`
- `matched_artist_ids uuid[]`, `match_status` (`matched` | `unmatched` | `partial`), `assigned_amount_per_artist`

**`monthly_artist_earnings`** — aggregated per artist per month
- `artist_id`, `account_name`, `period_year`, `period_month`, `total_streams`, `total_earnings`, `currency`, `upload_id`
- Unique on `(artist_id, period_year, period_month, currency)`

**RLS:**
- All new tables: admins manage; artists `SELECT` only their own rows.

**RPC `process_royalty_upload(upload_id uuid)`** (SECURITY DEFINER, admin-only):
- Reads `royalty_upload_rows`
- For each row: parses performers, matches `account_name`, splits net evenly
- Aggregates into `monthly_artist_earnings` (upsert)
- Credits `artists.available_balance` & `total_earnings`
- Writes `income_transactions` rows so the existing earnings dashboard stays consistent
- Updates upload counters/status

### 2. Admin UI

**New tab: "Upload Royalties"** (in AdminDashboard, alongside Income Management)
- Drop CSV → preview first 10 rows → choose `period_year` + `period_month` → Upload
- Client parses with **PapaParse**, inserts upload + rows, then calls `process_royalty_upload`
- Shows progress, then matched/unmatched summary

**Upload History panel**
- Table of past uploads (file name, period, totals, status)
- Click upload → detail view with tabs:
  - **Matched rows** (read-only)
  - **Unmatched rows** — admin can pick an artist to assign → re-runs aggregation for that row
- Reprocess / Delete upload buttons

**Artist Mapping Tool** — sidebar showing all unique unmatched performer names across history with "Assign to artist" dropdown (creates an alias entry; also sets that artist's `account_name` if empty).

### 3. Account Name standardization

- **Settings page**: new required "Account Name" field with helper text + duplicate validation.
- **Login modal** (`AccountNameMigrationModal`): if `artists.account_name` is null/empty, force-prompt with message: *"Please set your Account Name to match your artist name on ONErpm."* Blocks dashboard until saved.
- Admin override: admins can edit any artist's `account_name` from `ArtistsTab`.

### 4. Artist Dashboard upgrades

On `/earnings`:
- **Cards**: Total Earnings (all-time), This Month, Total Streams, Top Track
- **Monthly trend chart** (recharts line/bar) reading `monthly_artist_earnings`
- **Top tracks table** from `royalty_upload_rows` filtered by matched artist
- **Statement Generator card**: month + year picker + "Download PDF" button

### 5. Self-service Statement Generator

Reuse existing `generate-royalty-pdf` edge function, extended to accept `{ artistId, year, month }` and pull data from `monthly_artist_earnings` + matching `royalty_upload_rows` for the track-line table. Output: branded PDF with artist Account Name, period, per-track table (Title / Streams / Earnings), grand total in USD.

PDF is generated on demand and streamed back; optionally cached to `royalty_statements` row so repeats are instant.

### 6. Error handling

- CSV parse errors → toast + abort, nothing inserted
- Rows with `Net = 0` → skipped (flag in row record)
- Unmatched performers → stored, surfaced in admin queue
- Duplicate `account_name` on save → blocked with clear error

---

### Files to change

**New**
- `supabase/migrations/<timestamp>_royalty_ingestion.sql`
- `src/components/admin/RoyaltyUploadTab.tsx`
- `src/components/admin/UploadHistoryPanel.tsx`
- `src/components/admin/ArtistMappingTool.tsx`
- `src/components/AccountNameMigrationModal.tsx`
- `src/components/earnings/MonthlyTrendChart.tsx`
- `src/components/earnings/StatementGeneratorCard.tsx`
- `src/services/royaltyIngestionService.ts`
- `src/utils/onerpmCsvParser.ts` (PapaParse + performer extraction)

**Edited**
- `src/pages/AdminDashboard.tsx` — add Upload Royalties tab
- `src/pages/Settings.tsx` — Account Name field
- `src/pages/Earnings.tsx` — new chart, statement generator, top tracks
- `src/components/admin/ArtistsTab.tsx` — admin edit account_name
- `src/contexts/AuthContext.tsx` — trigger migration modal when account_name missing
- `supabase/functions/generate-royalty-pdf/index.ts` — accept artist+month params, pull from new tables

**Dependencies**
- `papaparse` + `@types/papaparse`

### Out of scope (can follow up)
- Configurable (non-even) multi-artist splits — defaulting to even split per spec
- Currency conversion — storing native currency from CSV; UI shows USD when currency is USD
- Automatic CSV pull from ONErpm API (still manual upload)
