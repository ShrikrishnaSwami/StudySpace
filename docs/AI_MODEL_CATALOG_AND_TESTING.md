# AI model routing and free-tier notes

Checked against Google's official model catalogue and pricing documentation on 2026-10-29:
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits

StudySpace's shared adapter catalogs ten distinct Gemini text-model IDs. Only free-tier or free-but-restricted models are considered by default. The two paid-only entries (gemini-3.1-pro-preview and gemini-4-argon) are not used unless GEMINI_ALLOW_PAID_MODELS=true is set. Do not set that variable on the free deployment.

Free-tier and access caveats:
- gemini-3.6-flash, gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3-flash-preview, and gemini-3.8-flash list free-tier inference in Google's pricing table; free-tier limits still apply.
- gemini-2.5-flash, gemini-2.5-flash-lite, and gemini-2.5-pro are listed as free-tier models but Google currently restricts access to projects that have actively used the 2.5 models previously. They are opportunistic fallbacks and may return access errors.
- gemini-3.1-pro-preview and gemini-4-argon are paid-only. The code keeps them disabled unless explicitly opted in.
- Free tier does not mean unlimited throughput. RPM, TPM, and RPD limits apply per Google AI Studio project. Model failures can still occur, and adding model IDs cannot guarantee availability.

The request path tries at most four models for ordinary text/stream generation and two for file-heavy tasks to keep latency bounded. The catalog is larger than the per-request attempt limit deliberately: this balances failover options against user wait time. Gemini 3.8 Flash is late in the list because this project previously saw capacity-related errors from it.

# Browser and database security tests

- Playwright smoke tests live in tests/e2e/security.spec.mjs; GitHub Actions installs Playwright at CI time so no paid service is required.
- pgTAP policy regression tests live in supabase/tests/database/admin_rls_mfa.test.sql. Run with the Supabase CLI after local Docker/database setup using supabase test db.
- These tests check anonymous admin API denial, basic auth page rendering, and regression protection for AAL2/cross-student RLS policies. They do not replace real two-account tests against production.