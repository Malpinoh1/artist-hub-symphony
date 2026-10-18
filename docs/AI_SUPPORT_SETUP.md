# MALPINOHdistro AI Support setup

## What this adds

- An authenticated AI Support page at `/ai-support`.
- A Supabase Edge Function named `ai-support` for AI replies and support-ticket creation.
- Private conversation/message tables and a small editable support-article table.
- A sidebar entry for AI Support.

This repository is a Vite + React app. The AI endpoint therefore runs as a Supabase Edge Function, not a Next.js Route Handler.

## Before enabling it

1. Review and apply `supabase/migrations/20261018120000_ai_support_foundation.sql` to the intended Supabase project.
2. Set the model API key as a Supabase Function secret. Never put it in `VITE_*` variables or browser code:
   ```sh
   supabase secrets set OPENAI_API_KEY=your_key_here --project-ref hewyffhdykietximpfbu
   supabase secrets set OPENAI_MODEL=gpt-4.1-mini --project-ref hewyffhdykietximpfbu
   ```
   The model setting is optional; the function defaults to `gpt-4.1-mini`.
3. Confirm the Edge Function has `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`), and `SUPABASE_SERVICE_ROLE_KEY` available in its runtime. The service-role key must remain server-side.
4. Deploy the function:
   ```sh
   supabase functions deploy ai-support --project-ref hewyffhdykietximpfbu
   ```
5. Build and test the frontend, then deploy the app using the existing Lovable/Vercel workflow.

## Authentication and permissions

The function uses the caller's bearer token and verifies it with Supabase Auth. It derives the ticket owner from the verified user; it does not accept a client-supplied `user_id`. Service-role access is used only inside the function for persisting conversations, messages, and tickets.

The function uses `verify_jwt = false` because it performs explicit token verification itself. Do not remove the in-function `auth.getUser(token)` check. If the project moves to Supabase's newer publishable/secret key model, revisit Edge Function key handling before disabling legacy keys.

The initial assistant only answers from published support articles and creates support tickets. It does not read private release/account records or submit/edit releases. The knowledge articles are seeded from the current Help Center and should be reviewed by the MALPINOHdistro team before production launch.

## Manual smoke tests

- Signed-out request to `ai-support` is rejected.
- Signed-in user can start a conversation and receive a model answer.
- Conversation ID belonging to another user is rejected.
- Empty and oversized messages are rejected.
- Ticket creation uses the authenticated user's ID and rejects invalid categories/priorities.
- A created ticket appears in the existing Support Center.
- Chat and ticket rate limits return a clear message.
- Missing `OPENAI_API_KEY` produces a safe configuration error without exposing secrets.
