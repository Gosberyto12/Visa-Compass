# Prioritized development backlog

## P0 — required before a controlled pilot

1. Run the Supabase migration and RLS test suite against the target Supabase CLI/PostgreSQL version; fix any SQL or policy test failures.
2. Configure a staging Supabase project, Auth email delivery/redirects, trusted operator roles and production-safe account deletion.
3. Enter and independently review an initial route set from official sources; verify effective dates, review intervals and source links.
4. Replace the process-memory limiter with a trusted distributed limiter and validate proxy IP handling.
5. Run end-to-end UI tests for registration, verification, sign-in/out, password reset, saved trip/checklist, admin review and unauthorized access.
6. Complete privacy/terms/legal review, support contact, retention, incident response and restore rehearsal.

## P1 — operational readiness

1. Add structured error monitoring and provider health/failure dashboards with privacy-preserving logs.
2. Schedule and alert on stale-rule processing; track queue age and source review SLAs.
3. Add guarded search-result persistence or saved search functionality without exposing private trips through public identifiers.
4. Add data export and deletion verification workflows, plus account support audit records.
5. Add integration tests for conflict/stale provider responses and source/provider licensing rules.

## P2 — commercial features

1. Confirm a Sherpa product contract, pricing, route coverage and commercial rights before implementing the adapter.
2. Add a payment-provider abstraction and verified webhook processing; never grant premium from browser-supplied status.
3. Implement premium PDF exports, reminders and change notifications only after licensing and reliable update sources are available.
4. Add PWA installability and offline behavior only for permitted public information with explicit freshness controls.
5. Consider native clients only after the responsive web MVP demonstrates a need.
