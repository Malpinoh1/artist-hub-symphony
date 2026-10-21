# MDISTRO Collective — Audit Findings and Implementation Plan

Audit date: 2026-10-21
Repository: `Malpinoh1/artist-hub-symphony`
Audited branch at start: `main` (commit `47e2f90aa791f729ba62e3aa0c5681276aac1d23`)
Supabase project: `MALPINOHDISTRO` (project ref `hewyffhdykietximpfbu`)

## Scope and evidence

This is a source and read-only database configuration audit. It did not change production database records, apply migrations, deploy functions, or modify the live website. It does not claim that authenticated browser journeys have been tested.

## Confirmed existing foundation

- The public application route `/collective`, member center `/collective/center`, and public member route `/collective/member/:handle` are registered in the React Router application.
- The mobile bottom navigation already contains a Collective entry.
- The Member Center mounts overview, directory, opportunities, announcements, and profile panels.
- The live project contains the core Collective tables: applications, members, referrals, roles, opportunities, submissions, announcements, and email events.
- The live project has 24 active role options; preserve these current values.
- The live project has active deployed Edge Functions: `collective-apply`, `collective-review`, `collective-referral-claim`, and `collective-notify`.
- Application submission validates the authenticated user, required fields and active role slugs. The source implements a per-IP hourly limit and duplicate protection. The database has a unique partial index for non-rejected applications by normalized email.
- Referral attribution is server-side and includes self-referral prevention and a unique index on normalized referred email.
- The directory RPC uses server-side filtering/pagination and filters by active membership, discoverability, and visibility.
- The profile update RPC requires the authenticated owner to have active Collective membership and validates the visibility enum.

## Findings requiring work

### High priority — privacy function drift

The checked-in migration `20261013091000_collective_profile_discoverability.sql` includes a `discoverable` check in `get_collective_public_profile()`, but the live database function definition inspected on 2026-10-21 did not include that check. This can let a direct RPC lookup return public profile fields despite the member's discoverability preference. The directory RPC did enforce discoverability. Reconcile with a new migration and a database regression assertion.

### High priority — admin statistics RPC grants

The live security advisor reports `get_collective_admin_stats()` as executable by `anon`. Its function body calls `user_is_admin()` before returning statistics, so this is not proof of a data leak, but anonymous execution is unnecessary. Revoke public/anonymous execution and retain authenticated execution with the existing server-side admin check.

### Medium priority — notification idempotency and wiring

The deployed `collective-notify` function is active and has contribution-review and broadcast actions. The source search did not find an application call site for the function. Its contribution-review action can insert a new notification and attempt email delivery every time it is invoked, so retries or duplicate clicks can create duplicate communications. Add status compare-and-set/idempotency to the review action and connect it to authorised administrative workflows in a later phase. Source changes alone do not change the deployed function.

### Medium priority — incomplete member experience

The current dashboard has five sections: overview, directory, opportunities, announcements, and profile. The full handover additionally requires distinct contribution history, referral history, notifications, and privacy controls. Profile editing accepts a photo URL, not an upload. The public profile page needs appropriate SEO/share metadata and must rely on the corrected server-side visibility rules.

### Medium priority — operational workflows not demonstrated

Live counts at audit time: 3 applications, 2 members, 3 referrals, 0 opportunities, 0 submissions, and 0 announcements. These counts do not prove that the code is broken; they mean populated end-to-end opportunity, contribution and announcement workflows cannot be inferred from production data. They must be tested using a safe test environment and real permissions.

### Medium priority — file handling

The live project has five public buckets (`artwork`, `audio_files`, `blog_media`, `release_artwork`, `releases`) with no bucket-level size or MIME limits reported in the bucket metadata. No dedicated Collective bucket was found. Before adding one, define private evidence requirements and inspect the existing storage policies; do not put private evidence in a public bucket.

### Test coverage gap

The root `package.json` has build and lint scripts but no dedicated test script. Add repeatable database/security regression checks and workflow tests. A successful build is not sufficient evidence for RLS, referral, email, or role-permission correctness.

## Implementation sequence

1. **Foundation hardening:** reconcile live RPC definitions with migrations; correct discoverability enforcement and admin RPC grants; add regression assertions; verify application, approval and referral idempotency.
2. **Member Center:** reuse existing panels; add contribution/referral histories, notifications and privacy controls backed by real data.
3. **Profiles and directory:** enforce privacy in every direct query; complete preview, SEO/share metadata, search/filter behaviour and pagination.
4. **Opportunities and contributions:** complete staff management, member submission, review lifecycle, private evidence storage, and safe retries.
5. **Administration and communications:** integrate member/opportunity/contribution management, announcements, notifications, delivery tracking, moderation and audit history into the existing admin system.
6. **Progression:** implement points, levels, badges or rewards only after the product owner approves the rules.
7. **QA and launch:** automated and manual regression tests, RLS/permission tests, mobile, email failure/retry, migration verification, build/lint, deployment verification, documentation and rollback instructions.

## Change-control and verification limits

- Work is on a reviewable feature branch; `main` is not modified.
- Database changes are migrations, not ad hoc production edits.
- The migration and test added with this audit hardening have not been applied to production or executed against a disposable test database.
- The `collective-notify` source hardening has not been deployed.
- No claim is made that all phases are complete. Remaining work is listed below and tracked by the implementation sequence above.

## Implemented on the feature branch after the initial audit

- A new migration restores discoverability enforcement in `get_collective_public_profile()`, returns no identity fields for restricted profiles, and removes anonymous execution from the admin statistics RPC.
- Database assertions cover profile privacy, grants, private evidence storage, submission deadline checks, link validation, broadcast deduplication, delivery-table access, and admin audit/member-management RPC permissions.
- Submission RLS now rejects new contributions to expired opportunities. A trigger prevents members from changing reviewer-controlled fields or assigning themselves a review status.
- A private `collective-evidence` bucket is defined with a 10 MiB limit and JPG/PNG/WebP/PDF MIME restrictions. Member and admin interfaces upload and open evidence through short-lived signed URLs.
- A public, owner-scoped `collective-avatars` bucket supports profile photo uploads (JPG/PNG/WebP, 5 MiB) and cleanup of replaced managed avatars.
- Opportunity expressions of interest are stored separately from contribution evidence, with withdrawal/reapplication, deadline checks, an admin review RPC, in-app status notifications, and retryable email delivery.
- Application review now guards against repeated decisions and concurrent status updates; duplicate application insert races return a conflict response.
- Contribution-review updates use status compare-and-set. Announcement/opportunity broadcasts deduplicate in-app notifications and have a service-role-only delivery table for retryable email attempts.
- The Member Center now includes contribution history, referral history and notifications. Public member pages include privacy-aware canonical and social metadata; the directory filters roles from the existing active role catalog.
- The existing admin Collective area now includes application search/role filtering, opportunity-application review, opportunity/announcement create/edit/publish/close controls, contribution review, member suspension/reinstatement with a required reason, referral abuse flags, restricted audit history, and actual workflow analytics.
- Opportunity and announcement broadcast controls allow an administrator to opt into email delivery and retry failed deliveries. Application receipt/decision emails, contribution review emails and opportunity-application review emails also use tracked, retryable delivery.
- Email HTML templates now escape member-controlled names, titles, handles and reviewer notes.
- A CI workflow builds the production bundle and lints the Collective files changed by this work. Full-repository lint currently has a large pre-existing error baseline, so CI is scoped to changed files to avoid unrelated refactoring.

## Verification status after these changes

- Latest code verification passed at branch head `161779568ddbd80b8245db62d51410ce342a7eb4`.
- GitHub Actions passed the production build, scoped ESLint, and Deno type-checking for the Collective application, review, referral-claim and notification Edge Functions.
- SQL regression assertions have been added but have not yet been executed against a disposable test database.
- No production migration has been applied and no Edge Function has been deployed. The frontend, migrations and Edge Function source must be released together in the documented order.
- Authenticated browser journeys, storage permissions, email failure/retry, member status transitions and audit RPC access still require end-to-end tests in a safe environment.


## Explicit remaining gaps before claiming full programme completion

- Member/profile/submission reporting and a dedicated moderation queue are not implemented yet. Referral records can be flagged, but that is not a complete abuse-report workflow.
- Application review currently uses the applicant-facing message field; a separate internal-only review-note field and history still need to be confirmed against the current schema and completed if absent.
- Opportunity records currently cover the existing schema and core workflow, but richer fields such as organisation, eligibility, compensation, location, application questions and attachment management are not all implemented.
- Announcements have create/edit/publish controls, but audience targeting, expiry and per-member notification preferences need additional work.
- Referral attribution corrections are deliberately not exposed until the product owner approves a deterministic correction policy.
- Points, levels, leaderboards and rewards remain gated on an approved progression/reward policy; no points schedule or financial benefit has been invented.
- SQL regression assertions have not been run against a disposable Supabase database. No migrations or Edge Functions have been deployed, and authenticated browser/storage/email journeys have not yet been tested end to end.
