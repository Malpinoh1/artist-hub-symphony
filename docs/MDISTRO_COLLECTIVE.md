# MDISTRO Collective — Phase 1

## Overview
Community program allowing Artists, Fans, DJs, Producers and more to apply, get approved, and refer others.

## Routes
- `/collective` — public application form (supports `?ref=<handle>` referral attribution)
- `/collective/center` — member dashboard (application status, membership, referral link + stats)
- Admin Dashboard → **MDISTRO Collective** tab — review queue and stats

## Database
- `collective_roles` — 24 seeded roles
- `collective_applications` — submissions, statuses: `pending`, `under_review`, `needs_information`, `approved`, `rejected`
- `collective_members` — approved members with unique handle, points, status
- `collective_referrals` — referral attribution, statuses: `registered`, `verified`, `qualified`, `active`
- `collective_email_events` — email audit log

RPCs: `get_my_collective_summary()`, `get_collective_admin_stats()`, `get_collective_public_profile(handle)`

## Edge Functions
- `collective-apply` (public, `verify_jwt = false`) — validation, IP rate limiting (5/hour), duplicate + self-referral protection, confirmation email
- `collective-review` (admin only via `user_is_admin`) — approve / reject / request info / under review, handle generation, member creation, referral qualification, notification emails

Emails are sent through Brevo using the shared templates in `supabase/functions/_shared/collective-emails.ts`.
