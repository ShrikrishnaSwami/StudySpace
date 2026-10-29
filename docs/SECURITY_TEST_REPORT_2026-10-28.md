# StudySpace security and reliability audit — 2026-10-28

## Scope and limitations

This report records live Supabase SQL checks, simulated authenticated-role reads, Vercel deployment metadata, and Vercel runtime-error summaries. It is not a full penetration test. SQL role tests set request.jwt.claims inside a rolled-back transaction; they did not exercise the browser, HTTP JWT verification, or real Storage uploads/downloads. StudySpace is student-only; the AI performs assignment grading. The additional non-admin account was used only to verify student ownership boundaries.

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
- **Additional student account:** saw its own 1 AI conversation and 4 messages, and no other account's rows. This checks student ownership boundaries only; AI grading must be tested through the server-side grading route.
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

Supabase Security Advisor still reports expected warnings for callable SECURITY DEFINER RPCs and anonymous-auth policies: the RPCs are intentionally exposed to authenticated callers but derive identity from auth.uid(), restrict operations to the caller, use an empty search_path, and have no anon EXECUTE grant. Guest sign-in uses the authenticated database role, so owner-bound policies remain visible to the advisor; real guest isolation was checked in the read matrix. The advisor also reports leaked-password protection is disabled; enable it in Supabase Auth settings if the project's plan supports it.

The SQL definitions and grants were verified. A live load/abuse test that sends bursts of HTTP requests using real tokens has not been completed because the current deployment is not ready and the AI provider key is empty.

## AI reliability

Initial configuration update (2026-10-28): GEMINI_API_KEY and the server-only SUPABASE_SECRET_KEY / legacy SUPABASE_SERVICE_ROLE_KEY aliases have now been added/updated as sensitive Vercel environment variables for the requested environments. This only changes environment configuration for future builds; the latest READY deployment is still commit ca9c3008 and does not yet prove these values are active in runtime. Both credentials were shared in chat and must be rotated immediately, then replaced in Vercel. Actual Gemini generation and privileged-route tests remain unverified until a new build/deployment is permitted and smoke-tested. Do not expose either value to client-side code or commit them.

Historical Vercel logs show Gemini provider 503 errors and a tutor timeout. A historical quiz_attempts.created_at query failure is already corrected in the current repository to order by completed_at. The latest successful deployment predates some later reliability changes. A compatibility overload was added to the live quota RPC so the deployed helper's two-argument call continues to work while ignoring caller-supplied limits; the newer one-argument helper enforces the daily limit in the database.

## Deployment and monitoring

- Latest successful Vercel production deployment is **READY** at commit ca9c3008 (fix: use caller-bound rate limit RPCs). Later changes on main are not in that deployment yet.
- An earlier build log identified TypeScript errors in the admin routes caused by the weak app_metadata type in src/lib/admin.ts; that type guard was fixed and committed. The current main-branch Vercel check reports the platform build-rate-limit gate, so the later changes have **not** been verified by a new production build.
- The last 24-hour Vercel runtime-error summary shows one AI Tutor temporary-unavailable event. The preceding 7-day summary also included Gemini 503 failures and an older timeout.
- Vercel Observability Plus is not enabled. Basic runtime logs and error grouping are available, but advanced observability configuration is unavailable on the current setup.

Do not treat a Git commit as a release. Do not manually deploy until the deployment allowance resets; first run CI/build checks, then deploy and smoke-test the exact commit.

## Backup and recovery

The available project API does not expose a verified backup inventory or restore-test result, so backup coverage is **not verified**. Check docs/BACKUP_AND_RECOVERY_RUNBOOK.md before launch. Supabase documents automatic daily database backups for Pro/Team/Enterprise plans and recommends regular off-site logical exports for Free projects; database backups do not include Storage file objects: https://supabase.com/docs/guides/platform/backups


## Table-by-table simulated SELECT results

Counts below are rows visible to each authenticated JWT claim set at audit time, not total table row counts. Student B is an additional non-admin account used for ownership-boundary testing. The private event tables are omitted from this matrix because authenticated users have no direct SELECT privilege on them.

| Public table | Student A | Student B | Guest | Admin |
|---|---:|---:|---:|---:|
| ai_tutor_conversations | 0 | 1 | 0 | 1 |
| ai_tutor_feedback | 0 | 0 | 0 | 1 |
| ai_tutor_messages | 0 | 4 | 0 | 19 |
| assignment_attachments | 0 | 0 | 0 | 0 |
| assignment_submission_files | 0 | 0 | 0 | 0 |
| assignment_submissions | 0 | 0 | 0 | 0 |
| assignments | 0 | 0 | 0 | 1 |
| calendar_events | 3 | 0 | 0 | 9 |
| course_goals | 0 | 0 | 0 | 0 |
| course_notes | 0 | 0 | 0 | 2 |
| course_resources | 0 | 0 | 0 | 0 |
| courses | 0 | 0 | 0 | 1 |
| flashcard_decks | 0 | 0 | 0 | 0 |
| flashcards | 0 | 0 | 0 | 0 |
| grade_items | 0 | 0 | 0 | 0 |
| homework | 1 | 0 | 0 | 3 |
| notifications | 0 | 0 | 0 | 11 |
| quiz_answers | 0 | 0 | 0 | 0 |
| quiz_attempts | 0 | 0 | 0 | 0 |
| quiz_questions | 0 | 0 | 0 | 0 |
| quizzes | 0 | 0 | 0 | 0 |
| study_group_members | 0 | 0 | 0 | 1 |
| study_group_posts | 0 | 0 | 0 | 0 |
| study_groups | 0 | 0 | 0 | 1 |
| study_plan_items | 0 | 0 | 0 | 0 |
| study_recommendations | 0 | 0 | 0 | 19 |
| study_sessions | 0 | 0 | 0 | 0 |
| studyspace_ai_embeddings | 0 | 0 | 0 | 35 |
| syllabus_imports | 0 | 0 | 0 | 1 |

Storage object metadata visibility: student 1, student B 0, guest 0, admin 7. This confirms policy-filtered metadata visibility for this snapshot; it does not prove that every download/upload/delete HTTP operation succeeds or fails correctly.


## Follow-up verification — 2026-10-28 (evening EDT)

This addendum updates deployment/configuration observations without changing the historical results above.

### Deployment

- The Vercel production deployment for commit `4d31f61acdfa11f53df63c4015aa71eafbc10283` (README and launch-checklist documentation updates on `main`) reached **READY** and is assigned to `www.studyspace.wiki` and `studyspace.wiki`.
- This deployment includes the previously merged reliability changes from PR #18 as well as the later documentation commits.
- The Vercel runtime-log query for the 30 minutes ending 2026-10-29 00:35 UTC returned no warning/error log records. The 24-hour grouped error summary still showed one earlier AI Tutor temporary-unavailable event. No direct HTTP/browser smoke test could be performed from the available environment, so authentication, AI generation, upload/download, grading, and deletion are not certified by this deployment-state check alone.
- The combined GitHub status endpoint continued to report a Vercel build-rate-limit failure for an earlier commit, but the latest Vercel deployment object itself reported READY for `4d31f61`. Use the deployment's commit SHA and state as the current deployment evidence; do not infer live functionality from the stale status alone.

### Current configuration and security-advisor observations

- Vercel environment-variable metadata confirms that production configuration entries exist for `NEXT_PUBLIC_SUPABASE_URL`, public Supabase key names, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_SECRET_KEY`. Secret values were not read or reproduced during this check. Their presence does **not** prove that the provider key works or that exposed credentials have been rotated.
- Supabase's current Security Advisor still reports leaked-password protection disabled. Enable it in Auth settings if supported by the project plan.
- The advisor flags six authenticated-callable SECURITY DEFINER functions: `admin_dashboard_stats`, `consume_ai_quota_for_user` (two overloads), `consume_my_api_rate_limit`, `get_my_ai_usage`, and `join_study_group_by_invite`. A direct catalog inspection found an empty `search_path` on each; no `anon` execution privilege; and function-specific checks that derive the caller from `auth.uid()` or, for admin statistics, require the trusted `app_metadata.role = 'admin'` claim. The quota compatibility overload delegates to the trusted one-argument function and ignores caller-supplied limits. These advisor warnings are not automatically proof of an exploitable issue, but their grants and bodies must be re-reviewed after changes.
- The advisor also flags policies on user-owned tables because the project permits anonymous Auth users, which can receive the `authenticated` database role. A read-only `pg_policies` query found no policies whose role list explicitly names `anon` or `public`. The prior simulated role matrix showed zero guest-visible rows in the tested snapshot. Keep anonymous/guest access only if it is an intentional product feature, and continue verifying that every policy is scoped to the user's own `auth.uid()` and that guest accounts cannot access other users' data.
- The 24-hour runtime-error summary contains one historical AI Tutor temporary-unavailable event. The latest 30-minute runtime log query returned no warning/error records; absence of logs is not a full end-to-end test.

### Still required before beta

1. Rotate/revoke any Gemini or Supabase credentials that were shared in chat and replace them in Vercel; rotation is not verified by this report.
2. Enable leaked-password protection where supported.
3. Run live smoke tests using real test accounts for sign-up/sign-in/logout, AI generation and quota exhaustion, syllabus import, homework/Storage access, quiz submission, assignment grading, export/deletion, admin denial for a normal student, and cross-student isolation.
4. Create an off-site database export and separate Storage export, then complete a restore drill in a non-production project.
5. Publish current privacy/terms/support information and document monitoring/rollback before inviting external students.
