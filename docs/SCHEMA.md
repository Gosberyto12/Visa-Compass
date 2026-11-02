# Database schema and access model

## Source of truth

Apply `supabase/migrations/20261024010000_initial_schema.sql`. Country directory fixtures are in `supabase/seed.sql`; the seed deliberately contains no visa rules. Supabase `config.toml` excludes the private schema from the PostgREST API.

## Main tables

- `countries`: ISO2/ISO3 names and initial focus indicator.
- `visa_rules`: route, passport type, purpose, pathway, conditions, effective dates, verification/publication state and review dates.
- `visa_requirements`: structured rule requirements and mandatory status.
- `data_sources` / `visa_rule_sources`: source references and explicit provider rights for storage, display and caching.
- `verification_logs`: immutable review method/outcome, sources and before/after snapshots.
- `visa_rule_versions`: append-only snapshots of published rules, requirements and source references.
- `profiles`, `saved_trips`, `trip_checklists`: user-owned account and trip preparation records.
- `subscriptions`: read-only to users; no browser write policy.
- `admin_audit_logs`: administrator read access and trigger-written editorial change entries; no ordinary update/delete policy.
- `private.user_roles`: role assignments, excluded from API access and with no user-facing write policy.

Foreign keys, uniqueness constraints, dates, currency, pathway and status checks, and lookup indexes are defined in the migration.

## RLS and publishing

- Public directory access is limited to country rows.
- Public clients can read current non-conflicted published visa rows only. A separate `public_visa_assessments` security-barrier view returns a redacted route status for stale/conflicted rules; it never returns the stale/conflicting pathway, conditions, requirements, fee or application link.
- Source and requirement tables are publicly readable only when linked to a current published rule. Licensed-provider sources additionally require explicit display rights.
- Authenticated users can access their own profile/trips/checklists; checklist requirements must match their saved route.
- Free trip insertion is limited to one trip in both RLS and a per-user transaction-lock trigger. Premium access requires an active/trialing subscription with an unexpired period end.
- Subscription status and entitlement have no user write policy. Provision payment state only from a trusted backend after a verified payment event; payment integration is not implemented.
- Editorial roles are stored in a private table. `has_role` is a read-only security-definer function. Verification requires a source link and source-check timestamp. Publication requires a reviewer, separate publisher authorization, source check, scheduled review date and no unresolved conflict.
- Published rule content, requirements and source links are immutable until the rule is returned to review. A publication creates a complete historical snapshot.
- Review logs and audit logs are append-only for normal application roles. An authorized service-role maintenance function can mark overdue published rules stale.

## Test the policies

```powershell
npx supabase@latest start
npx supabase@latest db reset
npx supabase@latest test db
```

`supabase/tests/rls.test.sql` checks anonymous/private separation, cross-user trip access, entitlement escalation, rule publication, and the free trip limit. These SQL integration tests require the local Supabase database and Docker; they cannot be exercised by the Node-only test runner.

## Source and freshness semantics

- `effective_from` / `effective_until` describe the source rule's effective period.
- `source_checked_at` records when VisaCompassAfrica checked the source.
- `next_review_at` schedules editorial review. Missing or elapsed review dates are treated as stale by the public assessment view.
- `mark_stale_visa_rules()` supports an authorized scheduled maintenance task. Scheduling it is an operator deployment step; the API still redacts expired records even before the status sweep runs.
- `conflict_flag` never lets the public view expose a chosen pathway. A reviewer must resolve the conflict and approve a new publication.
- Licensed data cannot be verified unless its source record explicitly documents permission to store and display it. Respect any additional terms for caching, attribution and retention.

## Privileged operations

Never expose `SUPABASE_SERVICE_ROLE_KEY`. It bypasses RLS and is not used by public search, accounts, trips or admin editorial actions. It is only used for the explicit account-deletion action and an external stale-sweep scheduler. Keep it in server-only deployment configuration and test both operations in a non-production project first.

Role assignments should be performed by a database owner using the protected SQL editor or migration process, for example:

```sql
insert into private.user_roles (user_id, role)
values ('<auth-user-uuid>', 'reviewer')
on conflict do nothing;
```

Do not grant `private` schema usage to anonymous/authenticated roles or build a self-service role editor.
