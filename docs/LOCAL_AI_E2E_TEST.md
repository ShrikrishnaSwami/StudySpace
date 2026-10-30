# Local synthetic AI end-to-end test

This test exercises the real local Next.js API routes with a dedicated synthetic student, synthetic course materials, two generated PDFs, and a disposable assignment. It calls the real configured AI providers. It does not mock model responses.

## Safety model

- The test runner only accepts a local StudySpace URL (localhost / 127.0.0.1).
- It explicitly blocks the production StudySpace Supabase project reference.
- It requires `E2E_ALLOW_MUTATIONS=true` and a second exact project-reference confirmation.
- Use a local Supabase stack or a separate disposable Supabase test project. Never point this at production or a real student's account.
- The test logs in as a dedicated E2E student account. It does not create, update, or delete that account.
- All created records carry a unique test marker. The runner tracks IDs and removes its synthetic records, PDF objects, and test conversation in a `finally` cleanup.
- Keep `.env.e2e.local` untracked. It is ignored by the repository's `.env*` rule. Never commit service-role keys or provider credentials.

## 1. Prepare an isolated Supabase environment

Use either:
- A local Supabase stack with the StudySpace migrations and Storage buckets applied; or
- A separate disposable Supabase project used only for automated testing.

The environment must contain the current StudySpace schema and the private buckets `assignment-files` and `assignment-submissions`. Create a dedicated student account in that environment and confirm it can sign in.

Do not reuse a beta student's account. The grader requires the server-side service role key, so the test project must be isolated.

## 2. Create `.env.e2e.local`

Copy this template and fill it with values from the isolated test project and dedicated E2E student:

```dotenv
E2E_SUPABASE_URL=http://127.0.0.1:54321
E2E_SUPABASE_ANON_KEY=your-isolated-anon-or-publishable-key
E2E_SUPABASE_SERVICE_ROLE_KEY=your-isolated-service-role-key
E2E_STUDENT_EMAIL=studyspace-e2e@example.invalid
E2E_STUDENT_PASSWORD=use-a-dedicated-test-account-password
E2E_PROJECT_REF=local
E2E_CONFIRM_ISOLATED_PROJECT=local
E2E_ALLOW_MUTATIONS=true
E2E_BASE_URL=http://127.0.0.1:3000
```

For a hosted test project, set `E2E_SUPABASE_URL` to that project's URL and set both project-reference values to the exact project ref in its hostname. The production ref is explicitly rejected.

## 3. Start the local app against the same isolated Supabase project

In PowerShell, open a terminal in the StudySpace project directory. Set the app's Supabase variables to the same isolated values from `.env.e2e.local` before starting Next.js:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "your-isolated-anon-or-publishable-key"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-isolated-service-role-key"
npm run dev
```

For a hosted disposable project, substitute its URL and keys. The app also needs its normal server-side AI provider credentials in its local environment. Keep those credentials local; do not add them to the test file or commit them.

## 4. Run the test in a second terminal

```powershell
npm run test:e2e:local-ai
```

The script reads `.env.e2e.local` and calls the local app. It has a 150-second timeout per AI request.

## What it exercises

| Specialist / workflow | Real request | Verification |
|---|---|---|
| Research | Upload synthetic PDF to `/api/ai/notes` | Extracted note is saved and contains concepts from the PDF |
| Tutor | Course-scoped NDJSON request to `/api/ai/tutor` | Stream completes and explains the synthetic course topic |
| Assessment | `/api/ai/quiz` | Questions and answer keys pass API validation |
| Memory | `/api/ai/flashcards` | At least three complete front/back cards are returned |
| Planner | `/api/ai/recommendations` | Recommendations have valid titles, actions, priorities and owned course IDs |
| Assessment grading | `/api/assignments/grade` | Reads synthetic student PDF plus separate prompt/rubric PDFs, returns a score within 20 points, persists AI feedback, and leaves the human grade field untouched |

The test seeds one synthetic course note and one resource so course-context retrieval has known source material. It also creates a disposable tutor conversation and assignment.

## Cleanup and failure handling

The test attempts cleanup whether it passes or fails. It deletes only IDs and storage paths created during the current run. It never deletes the E2E Auth user. If cleanup reports a warning, inspect that specific synthetic marker and remove only those test artifacts from the isolated environment.

AI calls may consume provider quota and the app's configured AI usage limits. Run against an isolated test project with test-specific quota settings. A provider outage, missing provider credential, quota response, malformed model output, or invalid API response fails the suite rather than being treated as a pass.

## Current scope / limitations

This is a live integration test, not a mocked unit test. It verifies the five specialist request paths and the separate PDF grading path. It does not assert which provider/model was selected from inside the server response because the public API intentionally does not expose provider internals; provider priority and model-selection behavior are covered by `npm run test:ai`.
