

## Plan: Enforce Workflow Validation & Status Tracking

### What Already Works
The `process_income()` DB function already handles Rules 1-4:
- Validates track exists (raises exception if not)
- Validates royalty splits total 100% (raises exception if not)
- Defaults to 100% primary artist when no splits exist
- Creates transaction records atomically

Email notification (Rule 5) fires after successful income processing in the UI.

### What Needs to Change

#### 1. Add `workflow_status` column to `incomes` table
Migration to add `workflow_status TEXT NOT NULL DEFAULT 'draft'` to the `incomes` table.

#### 2. Update `process_income()` DB function
- Set `workflow_status = 'processed'` on success
- Wrap in exception handler: on failure, insert income with `workflow_status = 'failed'` and re-raise
- This ensures every income record reflects its processing state

#### 3. Improve Admin UI validation (IncomeManagementTab.tsx)
- Before submitting, check if tracks exist — if zero tracks, show "You must create a track before adding income" and disable the Add Income form
- When a track is selected, fetch its royalty splits and display a warning banner if splits exist but don't total 100%
- Show `workflow_status` badge in income history table (draft/processed/failed)
- Add a workflow guide banner at the top: "Create Track → Set Royalty Split → Add Income"

#### 4. Ensure email fires only after successful processing
- Already the case (email sends after `process_income` returns without error), but add explicit check: only invoke `send-income-notification` if the RPC did not error

### Files to Change
- **New migration** — add `workflow_status` column, update `process_income()` function
- **`src/components/admin/IncomeManagementTab.tsx`** — add pre-validation UI, workflow guide, status badges in history
- **`src/integrations/supabase/types.ts`** — will auto-update after migration

### Technical Details

**Migration SQL** (simplified):
```sql
ALTER TABLE incomes ADD COLUMN workflow_status text NOT NULL DEFAULT 'draft';

CREATE OR REPLACE FUNCTION process_income(...) 
-- Same logic but:
-- 1. Insert income initially (already done)
-- 2. On success: UPDATE incomes SET workflow_status = 'processed' WHERE id = v_income_id
-- 3. On exception: UPDATE incomes SET workflow_status = 'failed', then re-raise
```

**UI validation additions:**
- Disabled "Add Income" tab content with message when `tracks.length === 0`
- Real-time split validation warning when selecting a track with incomplete splits
- Color-coded status badges in history: green=processed, red=failed, gray=draft

