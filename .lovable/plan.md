

## Plan: Fix Royalty Split Creation — Auto-Create Tracks on Release Upload

### Problem
The `tracks` table (used for income distribution and royalty splits) is only populated by admins. Artists upload releases which create `release_tracks` entries, but no corresponding `tracks` records. This means artists have no tracks to create royalty splits against.

### Current Architecture
- `release_tracks` — created during release upload (per-release track metadata)
- `tracks` — used by income/royalty system, has `primary_artist_id`, only created by admin via IncomeManagementTab
- `royalty_splits.track_id` references `tracks.id`
- `CreateRoyaltySplitForm` fetches from `release_tracks` for the track dropdown

### Changes

#### 1. Auto-create `tracks` records on release upload
**File: `src/pages/ReleaseForm.tsx`**

After inserting `release_tracks`, also insert corresponding records into `tracks` table for each track. Map `release_tracks` entries to `tracks` entries with `primary_artist_id = userId` and link them via a new `release_id` column.

#### 2. Add `release_id` and `release_track_id` columns to `tracks` table
**New migration**

```sql
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS release_id uuid;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS release_track_id uuid;
```

Add RLS policies so artists can INSERT and SELECT their own tracks:
- Artists can insert tracks where `primary_artist_id = auth.uid()`
- Artists can view tracks where `primary_artist_id = auth.uid()`
- Admins retain full access (existing policy)

#### 3. Update `CreateRoyaltySplitForm.tsx` — use `tracks` table instead of `release_tracks`
When a release is selected, fetch from `tracks` table filtered by `release_id` and `primary_artist_id = user.id` instead of `release_tracks`. This ensures splits are created against the correct table.

#### 4. Update `ArtistRoyaltySplits.tsx` description text
Change "Splits require admin approval before income distribution" to "Upload a release to start managing royalty splits." Remove any references to admin-created tracks.

#### 5. Update `IncomeManagementTab.tsx`
Remove the "Tracks are created by admin" messaging (already absent based on search, but ensure the admin track creation still works as a fallback).

### Files to Change
- **New migration** — add `release_id`, `release_track_id` to