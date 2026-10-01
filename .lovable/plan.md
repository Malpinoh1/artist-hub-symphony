# MDISTRO Collective Member Center Integration

## Goal
Upgrade the existing `/collective/center` into the approved-member hub while preserving the current application, referral, review, approval, email, membership, and security flows.

## Implementation

1. **Member access and status handling**
   - Keep `get_my_collective_summary()` as the single overview source.
   - Confirm active access with the existing server-side `is_active_collective_member()` RPC before mounting Phase 2 sections.
   - Keep pending, under-review, needs-information, rejected, and not-yet-applied experiences unchanged in purpose.
   - Treat suspended/inactive membership as non-active and do not mount member-only panels.
   - Show human-readable retry states if the summary or membership check fails.

2. **Member Center navigation and overview**
   - Add one responsive internal navigation control with Overview, Directory, Opportunities, Announcements, and My Profile.
   - Mount the four existing Phase 2 panels only for verified active members.
   - Preserve member name, handle, status, member-since date, current points balance, referral link, copy/share actions, and all four referral counters.
   - Keep layouts constrained and horizontally scrollable only within the compact tab control on narrow screens.

3. **Make existing panels integration-ready**
   - Add clear loading, empty, error, and success feedback without exposing raw database messages.
   - Keep all existing Supabase tables, RPCs, and RLS protections.
   - Fix the opportunity submission session assumption and only allow revisions in states already permitted by RLS.
   - Make search, cards, long values, forms, and action rows mobile-safe.
   - Display contribution areas returned by the privacy-aware directory RPC.

4. **Directory profile dependency**
   - Do not add the prohibited public member profile route.
   - Replace links to the missing `/collective/member/:handle` page with an in-center member detail dialog using only fields already returned by `list_collective_directory(...)`.
   - Remove the broken “View public page” action from My Profile until the public-profile phase is implemented.

5. **Mobile navigation**
   - Keep the five-item bottom bar size stable.
   - Replace its current “More” shortcut to Settings with a Collective shortcut; Settings remains available in the existing mobile drawer and user menu.
   - Keep the existing dashboard drawer as the complete navigation source, avoiding duplicate Collective menus.

6. **Verification**
   - Check the preview build and runtime logs.
   - Verify public `/collective` referral/auth entry remains intact.
   - Verify protected `/collective/center` unauthenticated behavior.
   - Test applicant/non-member and active-member states where available, without creating mock data.
   - Test the Member Center at desktop and mobile widths, including tab navigation and horizontal overflow.

## Technical scope

- Expected frontend changes: `src/pages/CollectiveCenter.tsx`, the four existing files under `src/components/collective/`, and `src/components/MobileBottomNav.tsx`.
- No new Collective tables, RPCs, Edge Functions, auth systems, public profile route, storage bucket, or admin tools.
- No database schema or RLS changes are planned; existing RPC and policy enforcement remains authoritative.
