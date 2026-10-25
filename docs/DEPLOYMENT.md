# Deployment, operations and recovery

## Current status

The repository is prepared for Next.js/Vercel and includes a GitHub Actions workflow. No remote repository, Supabase production project, Sherpa contract, payment configuration or successful deployment is present/claimed. Privacy and terms require qualified legal review.

## Before a controlled pilot

1. Create separate Supabase development/staging/production projects and restrict project-owner access.
2. Configure Auth email delivery, verification, password reset and exact site redirect URLs.
3. Apply migrations to staging, load only country seed records, run `supabase test db`, and manually test RLS and role workflows.
4. Provision a small number of reviewer/publisher/admin accounts out of band.
5. Add only source-verified visa records. Confirm source effective dates, source-check timestamps, review intervals and licensed-data rights.
6. Configure a shared distributed rate limiter and trusted proxy IP behavior. The current in-memory limiter is not safe across production instances.
7. Configure error monitoring and operational alerting without capturing search request bodies or secrets. Retain request IDs for support.
8. Review the privacy/terms text, deletion policy and support channel with qualified staff.
9. Run `npm ci`, lint, type checking, Node tests, Supabase RLS tests and a production build.

## Vercel

Import the repository into Vercel and use the checked-in Next.js configuration. Configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (production origin)
- `VISA_PROVIDER=database` only after reviewed rules are published and tested
- `VISA_PROVIDER_TIMEOUT_MS`
- `SUPABASE_SERVICE_ROLE_KEY` only if account deletion or trusted scheduled maintenance is enabled
- Any production shared-rate-limit credentials when that implementation is added

Keep Sherpa credentials unset until commercial and API approval is complete. Create preview deployments against a non-production Supabase project. Verify Auth redirects, the search endpoint, RLS, admin authorization, logs, source visibility and all critical routes before promoting production.

## Stale review scheduling

The public assessment view treats expired/missing review schedules as stale immediately. To keep the editorial `verification_status` queue synchronized, configure an approved database scheduler or server-side scheduled job to invoke `public.mark_stale_visa_rules()` using a privileged database role. The function is not executable by anonymous or normal authenticated clients. Do not place a service-role key in browser configuration.

## Backups and recovery

- Enable Supabase's appropriate managed backup/PITR tier for the project.
- Use separate environments and never test destructive migrations on production.
- Record the migration version and deployment release together.
- Periodically restore a backup into an isolated project and verify schema/data integrity and admin access.
- Keep source-of-truth editorial records and version snapshots in the database; retain external licensed data only as permitted.

## Rollback

1. If an app release is unhealthy, roll back the Vercel deployment to the last known-good build.
2. If a rule is wrong, mark it stale/withdrawn or flag a conflict; do not erase the history.
3. Database migrations are forward-only by default. For schema rollback, prepare and review a compensating migration; restore a backup only after assessing data loss.
4. Confirm public search returns either a current reviewed result or an explicit unverified/stale response.
5. Record the incident and actions in the operational audit trail.

## Local commands

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Supabase local database validation:

```powershell
npx supabase@latest start
npx supabase@latest db reset
npx supabase@latest test db
npx supabase@latest stop --no-backup
```
