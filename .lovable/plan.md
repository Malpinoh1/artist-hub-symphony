

## Plan: Allow Artists to Create Royalty Splits Without Admin Approval

### Problem
Currently, when an artist creates a royalty split, it's saved with `status = 'pending'`. The `process_income()` function only uses splits where `status = 'approved'`, meaning admin must manually approve each split before it takes effect. The toast message also says "submitted for admin approval."

### Changes

#### 1. Update `CreateRoyaltySplitForm.tsx` — set status to `approved` directly
- Change the owner's split insert from `status: 'pending'` to `status: 'approved'`
- For collaborators who already have an account, also set `status: 'approved'`
- Update the success toast from "submitted for admin approval" to "Royalty splits created successfully!"
- Update the submit button text to "Create Split & Send Invitations"

#### 2. Update RLS policy for artists creating splits
The current INSERT policy requires `status = 'pending'`. Need a migration to update the policy so artists can insert splits with `status = 'approved'` as well (for their own tracks).

**Migration:**
```sql
DROP POLICY IF EXISTS "Artists can create splits for own tracks" ON royalty_splits;
CREATE POLICY "Artists can create splits for own tracks"
ON royalty_splits FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM tracks t WHERE t.id = royalty_splits.track_id AND t.primary_artist_id = auth.uid())
  AND created_by = auth.uid()
  AND status IN ('pending', 'approved')
);
```

#### 3. Update `ArtistRoyaltySplits.tsx` description
Change "Collaborators will be invited via email" to clarify splits are active immediately — no admin approval needed.

### Files to Change
- **New migration** — update RLS INSERT policy to allow `approved` status
- **`src/components/CreateRoyaltySplitForm.tsx`** — change status to `approved`, update messaging
- **`src/pages/ArtistRoyaltySplits.tsx`** — update description text

