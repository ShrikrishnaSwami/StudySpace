# StudySpace

**Make room for what matters.**

StudySpace is an authenticated student workspace that combines courses, assignments and submissions, notes/resources, study planning, quizzes, flashcards, homework assistance, academic tracking, and AI-powered learning tools. The application uses Next.js, React, TypeScript, Supabase, and a server-side AI provider adapter.

> **Status: active development / beta preparation.** A passing build does not prove production is correctly configured. Verify the deployed commit and complete [docs/INITIAL_LAUNCH_CHECKLIST.md](docs/INITIAL_LAUNCH_CHECKLIST.md) before inviting real students.

## Contents

- [Overview](#overview)
- [Features](#features)
- [AI system](#ai-system)
- [Authentication and security](#authentication-and-security)
- [Data model](#data-model)
- [Architecture and API routes](#architecture-and-api-routes)
- [Technology stack](#technology-stack)
- [Configuration](#configuration)
- [Local development](#local-development)
- [Testing and CI](#testing-and-ci)
- [Deployment](#deployment)
- [Beta blockers](#beta-blockers)
- [Backup and recovery](#backup-and-recovery)
- [Repository guide](#repository-guide)

## Overview

StudySpace gives students one connected place for academic life. Records can feed into planning, search, reminders, and context-aware AI assistance. The product prioritizes a unified workspace, AI grounded in the current student's records, private student data, predictable AI usage, and verifiable releases.

StudySpace is not a self-trained foundation model, a guaranteed-correct grading authority, or a substitute for instructors and official course materials.

## Features

The authenticated app uses a shared navigation shell grouped into Learning, Study tools, Planner & progress, and Settings. Admin navigation is only shown to users with the trusted Supabase Auth role claim.

### Dashboard — `/dashboard`

Authenticated overview of academic records and upcoming work. Opening or refreshing it also synchronizes supported in-app reminders.

### AI Tutor — `/ai-tutor`

Academic chat with streaming responses and bounded retrieval over the signed-in student's available courses, notes/resources, assignments/due dates, quizzes and attempts/results, homework records, and calendar events. It supports step-by-step explanations, hints when requested, diagnosing attempted work, changing explanation style, and source labels where available. It should say when student-specific information is missing instead of inventing a course, grade, assignment, or deadline. AI output can be wrong and must be checked.

### Search everything — `/search`

Searches supported workspace records such as courses, assignments, quizzes, notes/grade items, homework, calendar events, and flashcard decks, linking to relevant views where supported.

### Courses — `/courses` and `/courses/[id]`

Create/manage courses and open course-specific details. Courses provide context for assignments, notes/resources, quizzes, calendar entries, and study tools. Verify create/edit/delete and refresh persistence in production.

### Assignments — `/assignments` and `/assignments/[id]`

Assignment list/detail views support coursework, course association, due dates, status/progress, priority, and instructions. Assignment owners can prepare work and reference material; assigned students can view and submit work through supported flows. Database protections are intended to prevent students changing assignment metadata or protected grade fields; submissions should be locked after submission according to the implemented workflow.

### AI-assisted grading — `/api/assignments/grade`

Protected server-side grading for supported submissions. The route validates authorization/ownership, gathers permitted reference material, and generates grading output such as grades, feedback, and rubric/criteria results. AI grading must be reviewed. Test maximum-point enforcement, persistence, retries, duplicate handling, and direct API attempts to alter grades before beta.

### Quizzes — `/quizzes`

Create/manage quizzes, generate questions with AI, submit attempts, and store results. API routes handle generation, authorized quiz reads, and submission. Verify score calculation, answer persistence, and attempt locking end-to-end.

### Notes and resources — `/notes`

Store course notes and learning resources. These records can be searched and used as AI Tutor context. Long notes are split into paragraph-aware overlapping chunks during retrieval so relevant text later in a note is not automatically lost.

### AI flashcards — `/flashcards`

Generate/manage flashcard decks for recall practice, optionally linked to courses. Generation uses the shared AI adapter and quota controls. Verify saved decks, refresh persistence, and ownership boundaries.

### Homework uploader — `/homework-uploader`

Manage homework records and supported uploaded files, with AI assistance through `/api/ai/homework`. Upload size limits and private Storage permissions apply. A successful upload does not prove every file type can be extracted or analyzed. Test the stored path, Storage access, supported format, text extraction, and analysis output end-to-end.

### Syllabus importer — `/syllabus-importer`

Extract academic events/due dates from pasted text or supported documents, associate an import with a course, and save results. The parser recovers JSON inside common markdown fences or surrounding provider prose, validates real ISO calendar dates, and returns a useful error when no clear events are found. Always verify dates against the original syllabus. Text-based PDFs and pasted text are the safest initial test cases; scanned documents may need OCR.

### Calendar — `/calendar`

View/manage academic deadlines, classes, and study events. Calendar events can be used by the Tutor and planning/reminder features. Verify time zones, editing, and persistence.

### Smart study planner — `/planner`

Organize study-plan items and scheduled work. Sessions can link to calendar events. Suggestions are planning assistance, not guaranteed optimal schedules.

### Grades and GPA — `/grades`

Track course grade items, targets, and credits where configured. Calculations depend on the data and grading conventions entered; verify formulas against institutional rules.

### Focus timer — `/focus`

Focused study timer interface. It is a productivity aid, not an operating-system blocker or guarantee that state survives browser closure.

### Progress analytics — `/analytics`

Summaries derived from available courses, assignments, quiz attempts, and study-session data. Results are only as complete as the underlying records; test calculations with known values.

### Study groups — `/study-groups`

Study-group records, membership, and posts. The invite/join API uses a narrow database function that derives joining identity from the authenticated session. Test valid/invalid codes, membership rules, concurrent joins, and private data boundaries.

### Notifications — `/notifications`

In-app types include assignment due/overdue, upcoming quizzes, quiz results, study reminders, calendar conflicts, AI recommendations, and system messages. The shared shell supports unread counts, read/mark-all-read actions, and realtime subscriptions where configured. Academic reminders are synchronized when the dashboard opens/refreshes; they are not email, SMS, or push notifications.

### Settings and AI usage — `/settings`

Account/preferences settings and a rolling 24-hour AI usage display for the current user. Usage is read through user-bound database functions rather than exposing private event tables. This depends on correct Supabase configuration and quota/usage migrations.

### Off-site backups

Daily encrypted PostgreSQL application-data and private Storage exports (with seven-day retention) are provided by [the GitHub Actions backup workflow](.github/workflows/offsite-backup.yml). Configure its required repository secrets and complete the first restore drill using [the off-site backup setup guide](docs/OFFSITE_BACKUP_SETUP.md) before storing real student coursework. The admin dashboard displays the latest workflow status; a successful upload is not the same as a verified restore.

### Admin dashboard — `/admin`

Restricted operational dashboard for aggregate application and AI feedback statistics. Protected endpoints and a narrow RPC provide permitted aggregate information. Admin authorization must use the trusted Supabase Auth `app_metadata.role = "admin"` claim, never user-editable `user_metadata`, display names, or client-only checks. The dashboard is not intended to expose all students' private messages or notes.

### Authentication and account operations

- `/login` — sign in.
- `/signup` — create an account under configured Supabase Auth and email-confirmation policy.
- `/auth/callback` — complete the supported authentication callback.
- `/api/export` — export supported records belonging to the authenticated user.
- `/api/account/delete` — account deletion; test with a disposable account.

Test email confirmation, session expiry, logout, export completeness, deletion behavior, and retention before beta.

### Public landing and health

- `/` — public landing page.
- `/api/health` — minimal liveness response with generic status and timestamp. It does not reveal which secrets/providers are configured and is not a full dependency-readiness check.

---

## AI system

### Generation architecture

Feature routes use `src/lib/studyspace-ai.ts` as a provider-independent boundary. It delegates to `src/lib/gemini.ts`, which handles configured providers, task guidance, model routing, timeouts, fallback behavior, and tutor streaming. Supported tasks are Tutor, quiz, flashcards, homework, syllabus, and recommendations. Gemini is the default. Optional OpenAI and Anthropic routing is available where the corresponding adapter, key, model access, and configuration are present. Environment variables alone do not guarantee provider availability.

### Context retrieval

Core modules:

- `src/lib/ai-context.ts` — loads authenticated student-owned records.
- `src/lib/ai-context-format.ts` — formats records for retrieval/prompting.
- `src/lib/studyspace-retrieval.ts` — lexical ranking, synonyms, chunking, and context limits.
- `src/lib/studyspace-semantic-retrieval.ts` — embedding-based semantic ranking and cache.
- `src/lib/studyspace-ai.ts` — generation boundary.
- `src/lib/gemini.ts` — provider calls and task-specific instructions.

Retrieval uses direct term matching, weighted hand-authored synonyms, record-level ranking, generic-word filtering, overview fallbacks, paragraph-aware overlapping chunks, stable source labels, and bounded prompt context. It searches only the authenticated student's loaded context, not other students' records.

### Semantic embeddings

When enabled/configured, the Tutor embeds the question and a bounded, category-balanced candidate set, then combines semantic similarity with lexical ranking. Cache data is stored in `studyspace_ai_embeddings` using content hashes/model identity and stable source metadata. The current implementation uses 768-dimensional vectors.

- Set `STUDYSPACE_SEMANTIC_RETRIEVAL=false` to force lexical-only retrieval.
- `STUDYSPACE_EMBEDDING_MODEL` selects the embedding model.
- The embedding API key is server-only.
- RLS scopes cache access to the authenticated user.
- Cache writes and stale-entry cleanup are best-effort; lexical retrieval is the fallback.
- The 90-day inactive-cache cleanup removes cached vectors, not original notes/coursework.

Embeddings are retrieval representations, not model weights. StudySpace does not train a foundation model through this process.

### Feedback and evaluation

Tutor answers provide helpful/not-helpful feedback stored as a student-scoped quality signal. Aggregate counts can be used in the admin dashboard. Feedback does not automatically train model weights or personalize provider parameters.

Synthetic tests cover relevant-record selection, paraphrases, long notes, empty/unmatched context, context bounds, and untrusted reference content. Passing tests validates only covered cases, not universal answer correctness. Keep evaluation data synthetic; private notes/chat logs must not become training data without informed consent, rights review, and a separate controlled pipeline.

### AI usage limits

`src/lib/api-security.ts` and database RPCs enforce per-feature rolling 24-hour limits and short-window burst caps. Current per-user daily ceilings:

| Feature | Rolling 24-hour ceiling |
| --- | ---: |
| Tutor | 40 |
| Quiz generation | 15 |
| Flashcards | 15 |
| Homework analysis | 20 |
| Syllabus import | 10 |
| Recommendations | 20 |

The AI roadmap also documents shared feature caps (Tutor 1,000; quiz 300; flashcards 500; homework 300; syllabus 150; recommendations 300) and a 1,500-request total rolling 24-hour cap across AI features. These are safety ceilings, not guaranteed free provider capacity or uninterrupted availability. Quotas depend on matching Supabase migrations/RPCs being installed and verified.

## Authentication and security

The browser uses Supabase Auth via `@supabase/ssr` and the Supabase JavaScript client. Protected APIs generally expect a bearer token and validate it with Supabase. Hiding a link is not authorization; server routes and database policies must enforce access.

Admin access uses `user.app_metadata.role === "admin"`. `app_metadata` is trusted configuration; `user_metadata` is user-editable and must not authorize privileged operations. After changing a role, sign out/in to refresh the token.

The migration history defines RLS policies for student-owned records, feedback, embeddings, private event tables, assignment submissions, study groups, and other features. The 2026-10-28 security report recorded RLS enabled on all 31 public tables, no direct anon SELECT on public tables, and private Storage buckets. These are audit-time observations, not proof that later configuration remains safe.

Configured private Storage buckets:

- `assignment-files` — 50 MiB cap;
- `assignment-submissions` — 50 MiB cap;
- `homework` — 20 MiB cap.

MIME restrictions are configured. Real upload/download/overwrite/delete and cross-user access still need testing through the Storage API. The server includes authenticated request checks, upload-size handling for supported workflows, AI quotas/rate limits, and narrow RPCs for privileged operations. Errors should not expose secrets, stack traces, raw provider payloads, or private database details.

No application is “unhackable.” Security depends on correct configuration, RLS, server authorization, dependency updates, monitoring, backup/recovery, and ongoing testing. See [docs/SECURITY_TEST_REPORT_2026-10-28.md](docs/SECURITY_TEST_REPORT_2026-10-28.md) for audit scope/limitations.

## Data model

Supabase provides PostgreSQL, Auth, RLS, database functions/RPCs, and Storage. Schema history lives in `supabase/migrations/`. Major data areas include:

- profiles and courses;
- assignments, attachments, submissions, submission-file metadata, rubrics/criteria, and grade protections;
- quizzes, questions, answers, attempts, and results;
- course notes and resources;
- homework and private uploaded files;
- calendar events and study-plan items;
- notifications and preferences;
- grade items and progress data;
- flashcard decks/cards;
- study groups, memberships, and posts;
- syllabus imports and extracted events;
- AI Tutor conversations, messages, and feedback;
- per-user AI embedding cache;
- private AI usage and API rate-limit event tables; and
- narrow functions for quotas, rate limits, admin aggregate statistics, and group joins.

Exact columns, constraints, indexes, triggers, grants, and policies are defined in migration SQL. Before deploying code that relies on a new table/column/RPC/bucket, apply and verify the matching migration in the intended project. Test RLS for authenticated/unauthenticated roles and use separate student/admin accounts.

## Architecture and API routes

### Request flow

1. Next.js renders pages and shared React components.
2. The browser authenticates with Supabase and uses its session for user-scoped requests.
3. Protected API routes validate identity and apply authorization/usage controls.
4. RLS and ownership checks constrain data access.
5. AI routes call the server-only provider adapter.
6. Supported results are saved and returned.
7. GitHub Actions validates dependencies, lint, tests, TypeScript, and production build.

### API route families

| Route | Responsibility |
| --- | --- |
| `/api/health` | Minimal liveness response. |
| `/api/usage` | Current-user AI usage summary. |
| `/api/admin/check` | Verify trusted admin role. |
| `/api/admin/stats` | Protected aggregate admin statistics. |
| `/api/ai/tutor` | Tutor response/streaming, retrieval, quotas. |
| `/api/ai/quiz` | AI quiz generation. |
| `/api/ai/flashcards` | AI flashcard generation. |
| `/api/ai/homework` | Homework assistance for supported inputs. |
| `/api/ai/notes` | AI note extraction/structuring. |
| `/api/ai/syllabus` | Syllabus event extraction/persistence. |
| `/api/ai/recommendations` | Study recommendations. |
| `/api/quizzes/[id]` | Authorized quiz read. |
| `/api/quizzes/[id]/submit` | Protected quiz attempt submission. |
| `/api/assignments/grade` | Authorized AI-assisted grading. |
| `/api/study-groups/join` | Invite-code group join. |
| `/api/export` | Current-user data export. |
| `/api/account/delete` | Account deletion. |
| `/auth/callback` | Supabase authentication callback. |

Source handlers are authoritative for exact methods, request fields, validation, and response shape. A route existing does not mean every provider or file format is supported.

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web | Next.js App Router | Pages, layouts, server routes, production build |
| UI | React | Interactive interface |
| Language | TypeScript | Types and static checks |
| Styling | Tailwind CSS 4 and global CSS | Responsive design |
| Icons | Lucide React | UI icons |
| Auth | Supabase Auth, `@supabase/ssr` | Session management |
| Database | Supabase PostgreSQL | Records, migrations, RLS, RPCs |
| Storage | Supabase Storage | Private coursework/submission files |
| AI SDK | `@google/genai` | Gemini integration |
| Optional providers | OpenAI / Anthropic | Optional routing where configured |
| Tests | Node test runner, TypeScript, ESLint | Regression/static validation |
| CI | GitHub Actions | Automated validation |
| Hosting | Vercel | Deployment/runtime |

Versions are declared in `package.json` and locked in `package-lock.json`. Use `npm ci` for reproducible installs.

## Configuration

Copy `.env.example` to `.env.local` locally. The example contains placeholders only.

### Required public configuration

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public browser key | No |

Configure one public key name consistently. Never expose a service-role/secret key to browser code.

### Server-only secrets

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini generation and embeddings |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Privileged server operations that explicitly require it |
| `OPENAI_API_KEY` | Optional OpenAI adapter |
| `ANTHROPIC_API_KEY` | Optional Anthropic adapter |

Never prefix these with `NEXT_PUBLIC_`. User-bound quota/retrieval operations may use the caller's token and not require an admin key; privileged flows such as account deletion may require a server-only key.

### Optional AI/app settings

| Variable | Purpose |
| --- | --- |
| `STUDYSPACE_SEMANTIC_RETRIEVAL` | Set to `false` for lexical-only Tutor retrieval. |
| `STUDYSPACE_EMBEDDING_MODEL` | Embedding model. |
| `GEMINI_MODEL` | Default Gemini model. |
| `GEMINI_TUTOR_MODEL` | Tutor-specific Gemini model. |
| `GEMINI_REASONING_MODEL` | Reasoning-task model. |
| `GEMINI_FAST_MODEL` | Fast-task model. |
| `GEMINI_FALLBACK_MODEL` | Optional fallback model. |
| `AI_PROVIDER_TUTOR` | Tutor provider group. |
| `AI_PROVIDER_REASONING` | Reasoning provider group. |
| `AI_PROVIDER_FAST` | Fast provider group. |
| `OPENAI_MODEL`, `OPENAI_TUTOR_MODEL`, `OPENAI_REASONING_MODEL`, `OPENAI_FAST_MODEL` | Optional OpenAI routing. |
| `ANTHROPIC_MODEL`, `ANTHROPIC_TUTOR_MODEL`, `ANTHROPIC_REASONING_MODEL`, `ANTHROPIC_FAST_MODEL` | Optional Anthropic routing. |
| `APP_ORIGIN` | Optional canonical origin for API-origin checks. |

Provider model IDs and availability change. Verify account access, quotas, and cost before deployment.

## Local development

### Prerequisites

- Node.js 22 or newer;
- npm and Git;
- a Supabase project with required migrations applied; and
- a Gemini API key for AI features.

Optional providers require their own accounts, keys, model access, and server-side configuration.

### Setup

```bash
git clone https://github.com/ShrikrishnaSwami/StudySpace.git
cd StudySpace
npm ci
```

Copy `.env.example` to `.env.local` and set local values. On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Start the server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
npm run lint
npm run test:retrieval
npm run test:syllabus
npx tsc --noEmit
npm run build
npm start
npm audit --audit-level=high
```

`npm start` serves the production build and should run after `npm run build` succeeds.

Troubleshooting:
- Run commands from the directory containing `package.json`, not a parent folder.
- If Next.js is “not recognized” or `node_modules` is inconsistent, check Node/npm versions and confirm `npm ci` completed.
- If Supabase URL/key errors appear, check variable names and restart the dev server after changes.
- If AI is not configured, verify server-side provider keys and model access.
- If usage controls report missing RPC/configuration, verify migrations and function signatures in the target project.
- If syllabus extraction finds no dates, try pasted schedule/due-date text or a text-based PDF and verify dates against the source.
- For production-only failures, inspect the exact Vercel deployment, environment scope, runtime logs, and Supabase logs.

## Testing and CI

GitHub Actions runs on pushes and pull requests targeting `main`. It installs locked dependencies, audits high-severity vulnerabilities, runs ESLint, retrieval and syllabus parser tests, checks TypeScript, and builds the app.

Run the same checks before beta:

```bash
npm ci
npm audit --audit-level=high
npm run lint
npm run test:retrieval
npm run test:syllabus
npx tsc --noEmit
npm run build
```

Retrieval tests validate synthetic cases, not every answer. Syllabus tests validate JSON recovery/date handling, not every PDF or event's meaning. Lint/types/build do not validate production secrets, provider access, live RLS, Storage, or end-to-end workflows. Dependency audit only reports known issues at run time. A green build is necessary, not sufficient, for beta.

## Deployment

1. Connect this repository to the intended Vercel project.
2. Confirm `main` is the production branch.
3. Configure variables in correct Development/Preview/Production scopes.
4. Keep provider and privileged Supabase secrets server-side.
5. Verify migrations, Auth settings, RLS, Storage buckets, and RPCs in the intended Supabase project.
6. Deploy the intended commit on `main`.
7. Confirm Vercel reports **Ready for that exact commit**.
8. Run live smoke tests and inspect runtime logs.
9. Check `/api/health`, remembering it is only a liveness check.
10. Keep a known-good deployment available and verify rollback.

Vercel build-rate limits can block deployment independently of GitHub CI. A passing GitHub build does not mean the new commit is live.

## Privacy and AI limitations

- Treat coursework, notes, submissions, grades, chat history, and uploaded files as private.
- Use synthetic fixtures and disposable accounts during development.
- Do not rely on hidden navigation for access control; server authorization and RLS are required.
- AI answers, summaries, questions, recommendations, and grades can be wrong.
- Do not train/fine-tune on private content without informed consent, rights, privacy review, and a separate controlled pipeline.
- Embeddings are cached retrieval representations, not trained model weights.
- Usage caps do not make providers free or always available.
- In-app notifications are not email/SMS/push delivery.
- Database backups do not include Storage objects; export and restore files separately.
- Publish accurate privacy, terms, retention, AI-limitations, and support information before opening to external users.

## Beta blockers

Verify these against the live deployment and current Supabase configuration; they are launch checks, not claims that every item is currently broken.

1. **Deployment:** deploy and smoke-test the intended commit; resolve any Vercel build-rate-limit issue.
2. **Credentials:** rotate/revoke provider/database keys previously shared in chat, screenshots, issues, or commits.
3. **Auth hardening:** enable leaked-password protection if supported and verify email-confirmation/sign-up settings.
4. **Security Advisor:** review remaining callable SECURITY DEFINER and anonymous-sign-in findings in context; do not disable features blindly.
5. **Storage:** test real uploads/downloads/overwrites/deletes, MIME/size checks, and cross-user denial.
6. **AI:** test provider outage, invalid model configuration, quota exhaustion, burst limits, malformed output, and safe errors.
7. **Syllabus/homework:** test supported inputs, file paths, extraction, and failure states; do not assume scanned documents are supported.
8. **Grading:** test max points, rubric feedback, persistence, retries, and student attempts to change grades/submissions.
9. **Export/deletion:** verify with disposable accounts and confirm retention.
10. **Backup/restore:** create off-site database and Storage exports and complete a restore drill in a separate project.
11. **Accessibility/UX:** test keyboard navigation, visible focus, labels, mobile layouts, and loading/empty/error states.
12. **Privacy/support:** publish policy/terms/support and incident reporting.
13. **Monitoring/rollback:** define failure detection and rollback to a known-good deployment.

See [docs/INITIAL_LAUNCH_CHECKLIST.md](docs/INITIAL_LAUNCH_CHECKLIST.md) for the detailed manual checklist.

## Backup and recovery

Read [docs/BACKUP_AND_RECOVERY_RUNBOOK.md](docs/BACKUP_AND_RECOVERY_RUNBOOK.md) before storing real coursework. Recovery requires PostgreSQL schema/data/functions/grants/policies and migration history; separate private Storage exports; application source and lockfile; an inventory of environment-variable names (never secret values); and a tested restore in a separate non-production project.

The runbook records that a verified external backup inventory and successful restore drill were not available at its audit date. Do not claim backups are ready until external backup files exist and a restore succeeds.

See [docs/SECURITY_TEST_REPORT_2026-10-28.md](docs/SECURITY_TEST_REPORT_2026-10-28.md) for audit scope/limitations and [docs/AI_ENGINE_ROADMAP.md](docs/AI_ENGINE_ROADMAP.md) for AI design/evaluation.

## Repository guide

| Path | Responsibility |
| --- | --- |
| `src/app/` | Next.js pages, layouts, auth callback, API handlers. |
| `src/app/api/` | AI, usage, admin, quizzes, grading, export, deletion, study groups, health. |
| `src/components/` | Shared UI, including authenticated `AppShell`. |
| `src/lib/` | Supabase clients, domain access, AI orchestration/retrieval, quotas, admin, notifications, utilities. |
| `src/lib/gemini.ts` | Server-only provider adapter, model routing, task guidance, generation/streaming. |
| `src/lib/studyspace-ai.ts` | Provider-independent AI generation boundary. |
| `src/lib/ai-context.ts` / `src/lib/ai-context-format.ts` | Student context loading/formatting. |
| `src/lib/studyspace-retrieval.ts` | Lexical retrieval, synonyms, chunks, context bounds. |
| `src/lib/studyspace-semantic-retrieval.ts` | Embeddings, semantic scoring, per-user cache. |
| `src/lib/api-security.ts` | AI quotas, burst controls, usage reporting, security helpers. |
| `src/lib/admin.ts` | Trusted admin role validation. |
| `src/lib/studyspace-retrieval.test.ts` | Synthetic retrieval regression tests. |
| `src/lib/studyspace-retrieval-evaluation.json` | Synthetic retrieval evaluation cases. |
| `src/lib/syllabus-parser.ts` / `src/lib/syllabus-parser.test.ts` | Syllabus JSON recovery/date tests. |
| `supabase/migrations/` | Ordered SQL schema, policy, function, trigger, index changes. |
| `docs/INITIAL_LAUNCH_CHECKLIST.md` | Manual production/beta checklist. |
| `docs/AI_ENGINE_ROADMAP.md` | AI retrieval design, evaluation, roadmap. |
| `docs/SECURITY_TEST_REPORT_2026-10-28.md` | Security audit scope and findings at recorded date. |
| `docs/BACKUP_AND_RECOVERY_RUNBOOK.md` | Backup, restore, incident recovery. |
| `.github/workflows/ci.yml` | GitHub Actions validation. |
| `.env.example` | Variable names/placeholders, not real secrets. |
| `package.json` / `package-lock.json` | Scripts and locked dependencies. |

This is a guide to major areas. Source files and migration SQL remain authoritative for exact implementation details.

## Development workflow

- Keep changes reviewable and add regression tests for parsing, authorization, retrieval, grading, and data isolation.
- Prefer shared server-side helpers over duplicating authorization, quotas, and provider logic.
- Never weaken RLS or expose a privileged route just to make the UI work.
- Use synthetic test data; never commit student records or secrets.
- Run automated checks before release and update docs when routes, variables, data handling, or launch requirements change.
- The agreed workflow is to work directly on the `main` branch; avoid extra feature branches and pull requests unless explicitly requested.
- Do not call a feature complete until verified at the appropriate level: regression test, integration test, or live deployment smoke test.

## License and contact

The package is marked private. This README does not assert an open-source license. Confirm intended licensing and support/contact details before making the repository or application public.
