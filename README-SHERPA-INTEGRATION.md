# VisaCompassAfrica provider integration status

The API expects a normalized request with passport nationality, destination, travel purpose, arrival date, optional departure date and passport type. The default `VISA_PROVIDER=mock` is safe and does not return a visa determination.

## Provider modes

- `mock`: local development only; outputs `unknown`, `unverified`, empty source/requirement data and a clear confirmation warning.
- `database`: optional Supabase integration; reads reviewed public assessments through RLS. Stale and conflicted rules are redacted.
- `sherpa`: intentionally disabled until the official product documentation, commercial contract and sandbox are confirmed.

The `lib/providers/sherpa-provider.ts` file does not guess the endpoint, authentication header or payload. Adding `SHERPA_API_BASE_URL` and `SHERPA_API_KEY` alone does not enable live requests.

## Activation requirements

Confirm the Sherpa product, commercial permission, coverage, supported purposes/passport types, pricing, sandbox, authentication and exact request/response schema, error semantics, rate limits, caching/storage/retention/redistribution rights, attribution and display restrictions. Then implement response validation, normalization, timeouts, safe retries, privacy-preserving logs, contract tests and source comparison using the approved documentation.

Never expose provider credentials to browser code. Do not scrape restricted systems or present provider data as a guarantee of entry.

See [the provider integration guide](./docs/PROVIDER-INTEGRATION.md), [the database guide](./docs/SCHEMA.md), and [the deployment guide](./docs/DEPLOYMENT.md).
