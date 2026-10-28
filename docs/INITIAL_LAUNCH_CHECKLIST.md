# StudySpace initial launch checklist

Use this checklist against the actual production environment before inviting real students. A successful Git commit or CI build is not a substitute for production smoke tests.

## 1. Production configuration

- [ ] Vercel deployment reaches **Ready** and points to the intended commit.
- [ ] Vercel production environment contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `GEMINI_API_KEY` is set as a server-only environment variable.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` is set only in server-side Vercel environments for features that require privileged operations.
- [ ] `STUDYSPACE_ADMIN_EMAIL` matches the intended administrator account.
- [ ] `APP_ORIGIN`, if configured, matches the canonical production origin.
- [ ] No real secrets are committed to Git, exposed through `NEXT_PUBLIC_`, or printed in logs.
- [ ] Provider keys that were shared in chat, screenshots, or issue comments have been replaced and the old keys revoked.

## 2. Supabase schema and access controls

- [ ] Apply and verify every migration in `supabase/migrations` against the correct project.
- [ ] Confirm Row Level Security is enabled on student-owned tables and policies prevent cross-user reads/writes.
- [ ] Confirm AI quota and API rate-limit RPC functions exist and reject unauthenticated or over-limit requests.
- [ ] Confirm embedding-cache policies restrict records to `auth.uid() = user_id`.
- [ ] Confirm feedback policies restrict students to their own feedback and conversations.
- [ ] Enable Supabase leaked-password protection in the Auth password/security settings.
- [ ] Review Supabase security and performance advisors; resolve warnings appropriate to the production workload.
- [ ] Test account deletion with a dedicated test account and confirm associated user-owned data is removed according to the documented retention policy.
- [ ] Confirm backups/recovery expectations before storing real coursework.

## 3. Authentication and account flows

- [ ] Create a test student account, sign out, sign back in, and test session expiry.
- [ ] Test email confirmation or the configured sign-up policy.
- [ ] Confirm protected pages and API routes reject requests without a valid session.
- [ ] Confirm a normal student cannot access admin pages or admin APIs.
- [ ] Confirm logout clears the visible authenticated state.

## 4. AI features

- [ ] Ask the tutor a general academic question and a question grounded in an existing course/note.
- [ ] Ask about a record that does not exist; confirm the AI says the data is unavailable instead of inventing it.
- [ ] Test a long note, a paraphrased question, and an empty student context.
- [ ] Test the lexical fallback with semantic retrieval disabled using `STUDYSPACE_SEMANTIC_RETRIEVAL=false`.
- [ ] Confirm Gemini/provider failures return a useful error without leaking secrets or raw stack traces.
- [ ] Confirm AI usage limits increment and requests are rejected when limits are reached.
- [ ] Rate an answer as helpful and not helpful; verify feedback persists and cannot be read by another user.
- [ ] Verify that deleting or editing a source does not expose stale content in subsequent answers. Source-cache cleanup is best-effort; do not treat the embedding cache as the source of truth.
- [ ] Test syllabus import with a representative real syllabus and verify extracted dates before relying on them.
- [ ] Confirm generated quizzes, flashcards, homework guidance, and recommendations are reviewed for correctness before relying on them.

## 5. Core student workflows

- [ ] Create/edit/delete a course and verify it remains after refresh.
- [ ] Create an assignment, submit student work, and verify the submission is saved.
- [ ] Test instructor grading/feedback end-to-end with a separate test/instructor account if that workflow is enabled.
- [ ] Create and submit a quiz; verify the saved attempt and score.
- [ ] Upload a homework file using an allowed file type and size; verify storage permissions.
- [ ] Create calendar events and verify dates/time zones.
- [ ] Test study-group invite/join flows with valid, invalid, expired, and already-used codes if supported.
- [ ] Test export and account deletion with a non-production test account.

## 6. Accessibility, privacy, and UX

- [ ] Navigate the main flows with keyboard only; check visible focus and labelled controls.
- [ ] Check desktop and narrow mobile widths for clipped content and unusable dialogs.
- [ ] Verify empty, loading, success, and failure states are understandable.
- [ ] Confirm private notes, uploaded files, and chat history are not exposed through public URLs or logs.
- [ ] Make it clear that AI outputs may be wrong and should be checked against course materials.
- [ ] Publish an accurate privacy policy, terms, and contact/support route before opening to external users.
- [ ] Avoid claiming model fine-tuning or automatic training from feedback unless a separate, consent-based training pipeline is built and evaluated.

## 7. Automated checks

Run locally and confirm GitHub Actions is green:

```bash
npm ci
npm run lint
npm run test:retrieval
npx tsc --noEmit
npm run build
npm audit --audit-level=high
```

## Launch decision

- [ ] All blocking checks above pass, or remaining limitations are explicitly accepted and documented.
- [ ] Production deployment is **Ready** and the live site has been smoke-tested against the deployed commit.
- [ ] A rollback path and a way to report problems are known.
- [ ] Only then invite real students.
