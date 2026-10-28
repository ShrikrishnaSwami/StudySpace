# StudySpace security and reliability audit — 2026-10-28

## Scope and limitations

This report records live Supabase SQL checks, simulated authenticated-role reads, Vercel deployment metadata, and Vercel runtime-error summaries. It is not a full penetration test. SQL role tests set request.jwt.claims inside a rolled-back transaction; they did not exercise the browser, HTTP JWT verification, or real Storage uploads/downloads. No dedicated instructor-role account exists in the current Supabase Auth users, so a normal non-admin account was used as an instructor-like owner-boundary check.

## Supabase RLS and Storage

Live project status: **ACTIVE_HEALTHY**, PostgreSQL 17.6.

| Check | Result |
|---|---:|
| Public tables with RLS enabled | 31 / 31 |
| Public tables without RLS | 0 |
| Public tables directly SELECTable by anon | 0 |
| Policies targeting PUBLIC in public schema | 0 |
| UPDATE/ALL policies missing WITH CHECK | 0 |
| Storage object policies | 13 |
| Public Storage buckets | 0 |

The two private event tables, ai_usage_events and api_rate_limit_events, deny direct table privileges to anon and authenticated; server-owned functions manage them. The AI feedback policies were changed from PUBLIC to authenticated. The admin submission-download policy relies on the trusted app_metadata.role = admin claim, not editable user metadata.

### Authenticated-role read matrix

The read checks covered all 29 user-data tables with authenticated table grants; the two service-only event tables were separately verified as inaccessible directly.

- **Guest account:** zero visible rows across the 29 user-data tables in the test snapshot.
- **Student test account:** saw only its own rows (3 calendar events, 1 homework item, and 1 object visible in Storage metadata); no course, note, assignment, conversation, message, feedback, quiz, or recommendation rows belonging to the other test account.
- **Non-admin instructor-like account:** saw its own 1 AI conversation and 4 messages, and no other account's rows. This account did not carry an instructor app-metadata role; instructor-specific assignment workflows still need a dedicated test account.
- **Admin account:** the normal student tables still showed rows owned by that admin account rather than exposing every student's private records. It saw 1 course, 2 notes, 1 assignment, 1 conversation, 19 messages, 1 feedback record, and 19 recommendations. Admin access to aggregate statistics is separately granted through the protected admin RPC.

Storage buckets are private: assignment-files (50 MiB cap), assignment-submissions (50 MiB cap), and homework (20 MiB cap). Each has MIME restrictions. Storage tests here checked policy definitions and object visibility counts; actual file download, upload, overwrite, and delete requests remain to be exercised through the Storage API with real role tokens.

## Admin RPC

public.admin_dashboard_stats() uses SECURITY DEFINER, an empty search path, and explicitly checks the trusted app_metadata.role claim. A simulated admin claim returned aggregate counts; previous non-admin verification correctly returned SQLSTATE 42501. The RPC returns aggregates only, not private chat messages or feedback contents.

## AI abuse controls

- Rolling 24-hour per-user limits: tutor 40, quiz 15, flashcards 15, homework 20, syllabus 10, recommendations 20.
- Shared rolling 24-hour feature caps: tutor 1,000, quiz 300, flashcards 500, homework 300, syllabus 150, recommendations 300, plus 1,500 requests total across all AI features.
- New per-feature burst limits: tutor 8/10 minutes; quiz, flashcards, and homework 4/10 minutes each; syllabus and recommendations 3/10 minutes each.
- User-facing quota and rate-limit RPCs derive the caller from auth.uid(). The quota RPC chooses its daily ceiling inside the database. The rate-limit RPC uses an allowlist of route keys and server-owned limits, preventing callers from choosing arbitrary routes or inflating their own caps.
- Usage reads now use a caller-bound aggregate RPC instead of direct access to the private event table. These changes remove the service-role key requirement for AI quota enforcement and usage display.

The SQL definitions and grants were verified. A live load/abuse test that sends bursts of HTTP requests using real tokens has not been completed because the current deployment is not ready and the AI provider key is empty.

## AI reliability

Vercel environment metadata shows GEMINI_API_KEY is empty in production, preview, and development. This prevents actual AI generation until a valid key is configured server-side. The service-role/secret keys are also empty in production; AI quota enforcement and study-group joining were reworked to avoid requiring that key, but privileged assignment grading and account deletion still depend on it.

Historical Vercel logs show Gemini provider 503 errors and a tutor timeout. A historical quiz_attempts.created_at query failure is already corrected in the current repository to order by completed_at. The latest successful deployment predates some later reliability changes. A compatibility overload was added to the live quota RPC so the deployed helper's two-argument call continues to work while ignoring caller-supplied limits; the newer one-argument helper enforces the daily limit in the database.

## Deployment and monitoring

- Latest successful Vercel production deployment is **READY** at commit ca9c3008 (fix: use caller-bound rate limit RPCs). Later changes on main are not in that deployment yet.
- An earlier build log identified TypeScript errors in the admin routes caused by the weak app_metadata type in src/lib/admin.ts; that type guard was fixed and committed. The current main-branch Vercel check reports the platform build-rate-limit gate, so the later changes have **not** been verified by a new production build.
- The last 24-hour Vercel runtime-error summary shows one AI Tutor temporary-unavailable event. The preceding 7-day summary also included Gemini 503 failures and an older timeout.
- Vercel Observability Plus is not enabled. Basic runtime logs and error grouping are available, but advanced observability configuration is unavailable on the current setup.

Do not treat a Git commit as a release. Do not manually deploy until the deployment allowance resets; first run CI/build checks, then deploy and smoke-test the exact commit.

## Backup and recovery

The available project API does not expose a verified backup inventory or restore-test result, so backup coverage is **not verified**. Check docs/BACKUP_AND_RECOVERY_RUNBOOK.md before launch. Supabase documents automatic daily database backups for Pro/Team/Enterprise plans and recommends regular off-site logical exports for Free projects; database backups do not include Storage file objects: https://supabase.com/docs/guides/platform/backups
