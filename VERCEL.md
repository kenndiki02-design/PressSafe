# Deploying PressSafe on Vercel

Vercel detects this as a Next.js application. Use the repository root as the
project root and configure a Node.js 20.x or newer runtime. The build command is
`npm run build`; Prisma Client is generated during install and before the build.

Configure these environment variables in the Vercel project settings for each
environment:

- `DATABASE_URL`: a reachable managed PostgreSQL connection string. Do not use
  the local Docker Compose database or its development credentials.
- `NEXTAUTH_SECRET`: a unique cryptographically random secret of at least 32
  characters. Keep it private and use the same value across instances in one
  environment.
- `NEXT_PUBLIC_APP_URL`: the canonical HTTPS URL for the deployment. Set the
  production domain here so verification links use the right host.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and
  `SMTP_FROM`: required for account verification emails.

The current frontend includes responsive role-based dashboard previews,
English/Kiswahili navigation, a local-only verification history, incident form,
browser-side file digest preview, training screens, and an offline app shell.
These are not production data workflows: AI fact-checking, external source
checks, evidence upload/encryption/storage, trusted timestamps, SOS dispatch,
check-in alerts, newsroom sharing, analytics, billing, and administrative
operations still require authenticated backend services and provider setup.
The frontend marks these preview-only actions so they are not mistaken for
delivered verification or emergency response.

A successful Vercel build confirms that the Next.js application can be deployed;
it does not certify external integrations, production security controls, or the
availability of those backend features.