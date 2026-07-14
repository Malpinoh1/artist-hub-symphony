# Monthly Streams Synchronization Upgrade

Upgrade the royalty ingestion pipeline so every ONErpm CSV upload updates both **earnings** and **streaming statistics** at monthly granularity, preserves history, and prevents duplicates.

## 1. Database changes (migration)

New table `public.monthly_stream_stats` (source of truth for stream history):

- `artist_id`, `release_id` (nullable), `track_id` (nullable), `upload_id`
- `period_year`, `period_month`
- `track_title`, `dsp_name`, `country` (nullable)
- `streams` (bigint), `downloads` (bigint), `quantity` (bigint)
- `revenue` (numeric), `currency`
- `created_at`
- Unique on `(upload_id, artist_id, track_title, dsp_name, country)` to avoid double-insert on reprocess
- GRANTs to `authenticated` (read own via artist) and `service_role`; RLS: artists read rows where `artist_id` matches an artist they own/have access to; admins/finance/distribution full read

Extend `royalty_upload_rows` parser to capture `dsp_name` (Store), `country`, and `downloads` when present in CSV.

Extend `process_royalty_upload` RPC:
- After clearing prior aggregates for `upload_id`, also delete from `monthly_stream_stats WHERE upload_id = p_upload_id`
- For each matched row, insert one `monthly_stream_stats` row per matched artist (streams = quantity, revenue = assigned_amount_per_artist)
- Attempt to resolve `track_id` by matching `track_title` against `tracks.title` for the artist (best-effort, nullable)

New RPC `check_month_already_imported(p_year int, p_month int)` returns list of upload ids for that period — used by UI to warn.

New views / RPCs for analytics:
- `artist_stream_totals(artist_id)` → lifetime, this_month, last_month, growth%, top_dsp, top_track, top_country, monthly_revenue
- `track_stream_totals(track_id)` → lifetime, current_month, previous_month, revenue, revenue_per_stream, dsp_breakdown, monthly_growth

## 2. CSV parser

`src/utils/onerpmCsvParser.ts`:
- Detect columns by header name (case-insensitive): `Store`/`DSP`/`Retailer` → `dsp_name`, `Country`/`Territory` → `country`, `Downloads` → `downloads`
- Continue using `Net` strictly and `Quantity` for streams
- Add new fields to `OnerpmRow`

`royaltyIngestionService.ts`: pass new columns into `royalty_upload_rows` insert.

## 3. Duplicate upload protection

In `RoyaltyUploadTab`:
- Before creating an upload, call `check_month_already_imported`
- If existing uploads for that year/month, show dialog:
  - **Replace existing month** (deletes prior uploads for that period, then processes)
  - **Cancel upload**

## 4. Admin – Monthly Streaming Manager

Add a section inside `RoyaltyUploadTab` (or new tab) listing uploads grouped by `period_label` with actions:
- View, Reprocess (existing `process_royalty_upload`), Delete, See logs, See totals (streams + revenue)

## 5. Artist dashboard analytics

New cards + charts (in Earnings or a new Analytics section):
- Total Lifetime Streams, This Month, Last Month, Growth %, Top Song, Top DSP, Top Country, Monthly Revenue
- Charts: Streams by Month, Revenue by Month, Streams by Store, Top Tracks

New hook `useArtistStreamStats(artistId)` querying `monthly_stream_stats` and computing aggregates client-side (or via RPC).

## 6. Release/track analytics

On `ReleaseDetails`, add a Monthly Streams section powered by `monthly_stream_stats` filtered by `release_id`/`track_id` (fallback to track_title match when track_id null): lifetime, current month, previous month, revenue, revenue-per-stream, DSP breakdown, monthly trend chart.

## 7. Automatic refresh

Invalidate the relevant React Query keys (`earningsData`, `monthlyEarnings`, new `artistStreamStats`, `trackStreamStats`) after upload completes, so all dashboards refresh with no manual reload.

## Technical notes

- All financial values remain USD (per project memory).
- Historical `monthly_artist_earnings` behavior is unchanged; the new table is additive for stream-level detail.
- All calculations for lifetime/monthly totals are derived from `monthly_stream_stats` — never overwritten.
- Reprocessing a single upload only clears that upload's rows, so other months are never touched.

## Files to touch

- `supabase/migrations/<new>.sql` — new table, grants, RLS, updated RPC, new RPCs
- `src/utils/onerpmCsvParser.ts` — new columns
- `src/services/royaltyIngestionService.ts` — pass new columns, add stats fetchers, duplicate-check helper
- `src/components/admin/RoyaltyUploadTab.tsx` — duplicate warning dialog, monthly manager list
- `src/hooks/useArtistStreamStats.ts` (new), `src/hooks/useTrackStreamStats.ts` (new)
- `src/components/earnings/*` and/or new `src/components/analytics/*` — new cards & charts
- `src/pages/ReleaseDetails.tsx` — monthly analytics section
