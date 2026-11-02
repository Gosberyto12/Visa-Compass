# Provider integration guide

## Current provider state

- `mock` is the default and produces no real visa determination.
- `database` reads source-backed, published VisaCompassAfrica rules through Supabase's public assessment view and RLS.
- `sherpa` remains deliberately disabled. The starter has no verified Sherpa endpoint, authentication contract, payload schema, license, sandbox access or credentials.

The provider interface accepts an African passport nationality, a destination country/territory ISO2 code, travel purpose, an optional departure date from the traveler's country followed by the required arrival date in the destination, and passport type. If supplied, departure must be on or before destination arrival. The UI only consumes VisaCompassAfrica result types.

Passport nationality is limited to 54 African countries. Destinations use a worldwide ISO country/territory directory; a selectable destination does not imply that published visa-rule data exists for that route.

## Activate database-backed searches

1. Configure a Supabase project and its public URL/anon key.
2. Apply and test the migrations/RLS in staging.
3. Enter real source-backed rules through the review workflow.
4. Verify and publish through separate authorized roles, including a future review date.
5. Set `VISA_PROVIDER=database`.

No data fixture is marked verified. Unknown, stale or conflicted results stay explicit and do not silently inherit a guessed pathway.

## Sherpa activation gate

Before writing a live adapter, obtain and verify all of the following in writing:

- Correct product and official technical documentation.
- Commercial authorization for the product, routes, purposes and intended freemium/premium UX.
- Sandbox credentials and representative approved fixtures.
- Endpoint, authentication, nationality/destination mapping, purpose/date fields, success/error response shapes and rate limits.
- Coverage for initial routes and any passport-type restrictions.
- Pricing, minimum commitments, cost monitoring and rate-limit behavior.
- Storage, caching, attribution, retention, redistribution and end-user display permissions.
- Timeout, retry and support expectations.

Implement only from that contract. Validate every upstream response, add contract tests, avoid logging personal data, use safe retry rules, compare representative rules with official sources and keep credentials server-only. Do not scrape restricted systems or treat provider output as a guarantee of admission.

The existing `SHERPA_API_BASE_URL`, `SHERPA_API_KEY` and `SHERPA_API_TIMEOUT_MS` variables are placeholders only. Setting them does not activate live calls.
