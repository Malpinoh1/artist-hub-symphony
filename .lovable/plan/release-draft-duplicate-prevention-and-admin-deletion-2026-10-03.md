# Release draft, duplicate prevention, and admin deletion

## What will change
- Keep the existing release wizard and automatic draft recovery, and add a clear **Save Draft** action artists can use at any step.
- Reuse each draft's existing ID as a submission key so repeated clicks, refreshes, or retries cannot create duplicate releases.
- Move the multi-table release creation into one authenticated database operation so partial submissions cannot leave duplicate or incomplete records.
- Replace client-side admin deletion sequencing with one admin-authorized database operation that deletes dependent release records safely before deleting the release.

## User experience
- Artists will see when a draft is being saved and can explicitly save it before leaving.
- The submit action will remain disabled while processing, and retrying the same saved draft will return the original release instead of inserting another.
- Admin deletion will continue using the existing confirmation dialog and will show a clear success or failure message.

## Technical details
- Extend existing `release_drafts` records with submission state/linkage rather than creating another draft system.
- Add one idempotent submission RPC and one admin deletion RPC, both deriving identity from the authenticated session and enforcing existing subscription/admin rules.
- Preserve existing release, track, store, clip, and free-track tables; no duplicate tables or authentication system.
- Update the existing release form hook/page and admin release service only where needed.

## Verification
- Check the draft save action and reload behavior in the preview where authentication permits.
- Verify repeated submission with the same draft key produces one release.
- Verify admin deletion removes a release with dependent `tracks` rows.
- Run focused type/lint checks and confirm the preview build is healthy.
