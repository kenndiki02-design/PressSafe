# PressSafe

PressSafe uses a vanilla HTML/CSS/JavaScript frontend and Vercel Node serverless functions. Supabase provides identity, PostgreSQL, and private object storage. Organization roles and records are tenant-scoped by server-side APIs.

## Run locally

For UI-only preview, open `index.html`. API-backed account and storage flows require HTTPS/localhost through Vercel or `vercel dev`; direct `file://` access cannot call `/api` endpoints. The service worker requires HTTPS or localhost.

## Deploy to Vercel

Import the repository and leave the framework preset as **Other**. Set the project root to this folder. Do not set a build command or output directory. Vercel serves `index.html`, `api/*.js` functions, and static assets.

## Configure Supabase

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL editor.
2. Enable email confirmation and configure the production email provider in Supabase Auth.
3. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Vercel. The service-role key is server-only and must never use a `NEXT_PUBLIC_` prefix.
4. Set a long random `ADMIN_INVITE_CODE`. Use it once to bootstrap the first admin, then rotate/remove it. Admin creation also requires strong account verification.
5. Admins create organizations and issue one-time, role-scoped invites. Invite codes are stored as SHA-256 hashes, expire, and have a use limit.
6. Configure `SUPABASE_EVIDENCE_BUCKET` only if a private bucket with the schema's size/MIME policy is provisioned. The schema creates the default bucket.

The API returns `503` until its required Supabase environment is configured. This checkout has not been tested against live Supabase credentials.

## Prototype limitations

- Role switching is available only in preview mode and is not authorization. Registered roles come from the server profile.
- Claim submissions, cases, incidents, privacy requests, contacts, check-in timers, review decisions, training progress, audit events, and evidence metadata use API routes once configured.
- Evidence is AES-GCM encrypted in the browser before signed upload. The passphrase is never stored; losing it makes evidence unrecoverable. File metadata remains visible to authorized staff.
- SOS records are saved but do not notify contacts. Missed check-ins do not trigger alerts until a tested notification provider and scheduled job are configured.
- AI/fact-check providers, SMS/email alert delivery, billing, legal timestamp certificates, and privacy-request fulfillment are not configured by this repository.
- Organization dashboards use scoped records; large production deployments still need load testing, retention/backup policy, incident-response operations, and independent security review.

Before production, test account verification, RLS/service-role policies, backups, audit retention, rate limits, email deliverability, storage limits, and emergency notification delivery. Do not rely on this app for emergency response or legal evidence certification until those services are configured and independently tested.