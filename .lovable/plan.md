

## Plan: Direct Admin Subscription Management

### What exists now
- Admin can edit and activate subscriptions via an edge function (`admin-update-subscription`)
- The edge function validates admin role, then upserts into the `subscribers` table
- No "Remove" or "End Subscription" quick actions exist

### What needs to change

#### 1. Add Remove/End actions to the admin UI
- Add a **"Remove Subscription"** button (deletes the row from `subscribers`)
- Add an **"End Subscription"** quick action (sets `subscribed = false`, clears tier/end date)
- Add confirmation dialogs for destructive actions
- Both edit and activate flows already work; keep them, just add the new actions

#### 2. Update the edge function to support `action` parameter
- Add support for `action: "remove"` which deletes the subscriber record entirely
- Add support for `action: "deactivate"` which sets `subscribed = false`
- Keep existing upsert logic for activate/edit (default action)

#### 3. Add RLS policy for admin DELETE on subscribers
- Currently `subscribers` table has no DELETE policy — admins cannot delete records
- Add a migration: `CREATE POLICY "Admins can delete subscribers" ON subscribers FOR DELETE USING (user_is_admin())`

### Files to change
- `supabase/functions/admin-update-subscription/index.ts` — add remove/deactivate actions
- `src/components/admin/SubscriptionManagement.tsx` — add Remove & End buttons with confirmation
- New migration — add admin DELETE policy on `subscribers`

