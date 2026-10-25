# VisaCompass controlled-pilot starter

VisaCompass helps travellers organize passport-specific visa information and travel preparation. It is not a visa issuer, government authority, legal adviser, or guarantee of admission. Visa information can change; users must confirm current requirements with the destination authority.

## Implementation assessment and checklist

| Area | Exists | Improved in this build | Still missing / gated |
|---|---|---|---|
| Web application | Next.js App Router, TypeScript and responsive landing/search UI | Date- and passport-type-aware search, accessible states, public content routes | Native applications and installable PWA |
| Search API | Basic POST endpoint and input parser | Normalized response, request IDs, strict body size/media checks, safe errors, no-store responses | Shared production rate limiter and monitoring |
| Providers | Mock provider and Sherpa adapter boundary | Safe mock returns unknown/unverified; optional Supabase published-rule provider with timeout | Live Sherpa contract, authorization, credentials and sandbox |
| Database | Draft schema | Supabase migration, seed, RLS, publication workflow, versions, audit, trip/subscription schema | Apply migrations to a configured Supabase project and run database tests |
| Accounts | None | Supabase Auth sign-up/verification, sign-in/out, reset/update password, profile and deletion actions | Project credentials, email templates/SMTP, verified production deletion/support operations |
| Saved travel | Session-only demo interaction | Private saved trips, editable checklist progress/notes, free/premium server and RLS entitlement checks | Payment provider, premium activation and exports/reminders |
| Editorial/admin | None | Role-protected rule/source/review/publication flows; audit and subscription views | Production operator provisioning, user directory/impersonation, external failed-request monitoring |
| Delivery | README and Sherpa notes | CI workflow, Vercel config, migration/test/deployment guides | Git remote, production credentials, actual deployment and restore rehearsal |
| Verified route data | None | Explicit unknown/stale/conflict handling; no visa rules seeded | Reviewed official sources and approved data-entry/review before any route is presented as verified |

## Requirements

- Node.js 20.9+
- npm
- For Supabase local migrations and RLS tests: Supabase CLI and Docker

## Run locally

From the project directory:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`. The safe default is `VISA_PROVIDER=mock`; mock searches are explicitly unverified and make no visa determination.

Available validation commands:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

## Configuration

See `.env.example`. For account/database features, configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase project. These public client values are protected by RLS. Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or browser code.

`SUPABASE_SERVICE_ROLE_KEY` is optional and used only by the server-side self-service account deletion action. Keep it in the server environment, restrict its access, and rotate it if exposed. Do not configure it until the deletion workflow has been tested in the target project.

`VISA_PROVIDER` accepts:

- `mock` (default): no visa determination; unverified demo output.
- `database`: reads published assessments through Supabase RLS and a redacted public view. This requires configured Supabase values and reviewed, published rules. Missing database configuration fails explicitly; it does not fall back to mock.
- `sherpa`: intentionally fails closed. The adapter is not implemented because the official contract and commercial authorization are not available.

Set `NEXT_PUBLIC_SITE_URL` to the exact origin used for auth email redirects. Configure Supabase Auth redirect allow-lists to match.

## Supabase database

The authoritative schema is versioned under `supabase/migrations/`; `database-schema.sql` points to it. The seed creates country directory records only—there are no fictional visa-rule fixtures.

For local development:

```powershell
npx supabase@latest start
npx supabase@latest db reset
npx supabase@latest test db
```

The RLS test file is `supabase/tests/rls.test.sql`. `db reset` recreates the local database, applies migrations and seeds; do not use it against a production project.

For a linked remote project, review the migration first and then use `npx supabase@latest link` and `npx supabase@latest db push`. Apply migrations to a staging project first. See [the schema guide](./docs/SCHEMA.md).

## Search API

`POST /api/visa-check` accepts JSON:

```json
{
  "passportCountry": "TZ",
  "destinationCountry": "KE",
  "purpose": "tourism",
  "arrivalDate": "2027-03-15",
  "departureDate": "2027-03-29",
  "passportType": "ordinary"
}
```

`departureDate` and `passportType` are optional (`ordinary` is the default passport type). The response is provider-neutral and includes assessment/freshness status, entry pathway, conditions, requirements, source references, verification date, limitations, confirmation warning and a request ID. Errors use a stable `{ error: { code, message, requestId } }` shape. Responses are not cached.

The database provider only returns active rule details for current, non-conflicted, published records. Stale and conflicted records are exposed through a redacted view with no entry pathway or requirements. No data or unsupported route returns an explicit unverified assessment.

## Account and editorial operations

Account routes: `/login`, `/register`, `/forgot-password`, `/dashboard`, `/dashboard/trips`, `/dashboard/settings`.

Admin routes: `/admin`, `/admin/visa-rules`, `/admin/reviews`, `/admin/sources`, `/admin/subscriptions`, `/admin/audit`, `/admin/users`. Users cannot assign their own editorial roles. Provision admin/reviewer/publisher membership out-of-band in the private `user_roles` table; see [the admin guide](./docs/ADMIN.md).

Subscriptions are read-only from the application. There is no checkout or payment integration. Free accounts can save one trip; multiple saved trips, reports and reminders require an active server-verified subscription entitlement. The database enforces the free trip limit as well as the server action.

## Sherpa integration

See [README-SHERPA-INTEGRATION.md](./README-SHERPA-INTEGRATION.md) and [the provider guide](./docs/PROVIDER-INTEGRATION.md). No endpoint, authentication scheme, request schema, coverage, pricing, or licensing is assumed. Live calls remain disabled until documentation, commercial approval and a sandbox are confirmed.

## Deployment

The repository includes a Next.js Vercel configuration and a GitHub Actions CI workflow. This does not mean the application has been deployed. Configure separate development/staging/production Supabase projects, production environment variables, email delivery, shared rate limiting, backups and monitoring before a pilot. Follow [the deployment guide](./docs/DEPLOYMENT.md).

## Documentation

- [Database schema and RLS](./docs/SCHEMA.md)
- [Admin operating guide](./docs/ADMIN.md)
- [Sherpa/provider activation guide](./docs/PROVIDER-INTEGRATION.md)
- [Deployment, backup and rollback](./docs/DEPLOYMENT.md)
- [Prioritized backlog](./docs/PRIORITIZED-BACKLOG.md)

## Current limitations

- The repository has no verified route records; do not treat mock responses as visa guidance.
- Supabase credentials/project, auth delivery settings and database migration execution are external setup work.
- The process-memory rate limiter is a local safeguard only; use a trusted shared store before public traffic.
- Account deletion requires the server-only service-role key. Test the cascades and support process before enabling it.
- Privacy and terms pages are drafts and need qualified legal review before public use.
- Sherpa, payment processing, change monitoring, PDF export, monitoring/alerting and production deployment are not implemented or claimed.
