# Admin operating guide

## Access and roles

Admin routes require a valid Supabase session and one of the private `admin`, `reviewer` or `publisher` assignments. The app checks the `has_role` database function; RLS and workflow triggers enforce authorization again. Hiding controls is not the security boundary.

Provision roles outside the application through a protected Supabase database-owner session. Users cannot add roles to themselves. Assign the minimum needed:

- `reviewer`: manage drafts/sources/requirements, submit rules and record a verification outcome.
- `publisher`: publish rules after verification; cannot review a rule.
- `admin`: operational oversight, audit/subscription views and full editorial authorization.

Use individually attributable user accounts. Do not share admin credentials.

## Rule lifecycle

1. In **Sources**, add a source with an HTTPS URL and source type. For licensed data, enter the actual contract/attribution notes and explicitly confirm store/display rights before attaching it.
2. In **Visa rules**, create a draft with passport nationality, destination, purpose, passport type, pathway, effective period (if known), conditions, any verified fee/application details and a scheduled next review.
3. Attach one or more supporting source records.
4. Add structured requirements and indicate required/optional only when the source supports it; otherwise leave status unverified.
5. Submit the draft to the verification queue.
6. A reviewer records the verification method, outcome and notes. Approval sets the source-check timestamp and stores a verification log; rejection/changes return the item to draft. Conflicts move the rule to stale and suppress public details.
7. A separate publisher publishes a verified rule. Publication captures a version snapshot and an audit entry.
8. If published content or source links change, first return the rule to review. Direct edits to active published content are rejected by database triggers.
9. Mark a rule stale or withdraw it when necessary. The stale maintenance function can be scheduled by an operator; overdue rules are redacted even before that task runs.

Do not infer a legal requirement from incomplete provider data, invent an official source URL, or claim that checklist completion guarantees approval.

## Queues and operational pages

- `/admin/reviews`: review pending submissions, publish verified records, flag conflicts, mark rules stale or withdraw them, and inspect publication snapshots.
- `/admin/visa-rules`: draft, attach sources and add route requirements.
- `/admin/sources`: manage sources and licensed data permissions.
- `/admin/audit`: administrator-only editorial audit history.
- `/admin/subscriptions`: read-only subscription support status; no payment or entitlement editing.
- `/admin/users`: documents that user directory/impersonation is intentionally not exposed. Manage identity operations through the protected Supabase Auth dashboard.

## Incident handling

- If a source conflict or correction is reported, flag the rule immediately; public output will suppress the pathway and requirements.
- If a source becomes stale, mark it stale or run the scheduled stale sweep.
- For a provider outage, switch to the safe `mock` provider or disable searches; mock results are not guidance.
- Review audit entries after editorial changes and monitor server logs using request IDs. Do not log submitted traveler data, credentials or full upstream payloads.

## Account deletion

Self-service deletion is available only when the server-only `SUPABASE_SERVICE_ROLE_KEY` is configured. It deletes the authenticated Supabase Auth user and related profile, trips, checklists, subscription and role rows through foreign-key cascades. Test this in staging, document your support/retention policy, and verify audit retention before enabling it in production.
