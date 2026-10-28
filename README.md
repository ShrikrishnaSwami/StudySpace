# StudySpace

StudySpace is a student workspace built with Next.js, React, TypeScript, and Supabase. It includes course and assignment workflows, an AI tutor, quiz and flashcard generation, homework assistance, and student productivity tools.

## Local setup

1. Install Node.js 22 or newer and Git.
2. Clone the repository and enter the project folder.
3. Install dependencies with `npm ci`.
4. Copy `.env.example` to `.env.local`.
5. Configure the required environment variables listed below.
6. Start the development server with `npm run dev`.

## Environment variables

Required for the core app:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase publishable/anon key)

Required for AI features:
- `GEMINI_API_KEY` (server-side only; never expose it with a `NEXT_PUBLIC_` prefix)

Required for quota enforcement, admin-only server actions, account deletion, and other privileged workflows:
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` (server-side only; never commit the real value or expose it to the browser)

Set `STUDYSPACE_ADMIN_EMAIL` to the verified administrator account email. Configure production values in Vercel's project environment settings, not in source files. Optional provider/model settings are documented in `.env.example`.

## Quality checks

Run before merging or launching:

```bash
npm ci
npm run lint
npm run test:retrieval
npx tsc --noEmit
npm run build
npm audit --audit-level=high
```

GitHub Actions runs lint, AI retrieval regression tests, TypeScript checking, a production build, and a high-severity dependency audit on pushes and pull requests to `main`.

## Database

Use the SQL migrations in `supabase/migrations` as the version-controlled schema history. Review `docs/INITIAL_LAUNCH_CHECKLIST.md` before launch, and confirm the migrations are applied to the intended Supabase project. Never paste service-role keys, database passwords, or provider API keys into issues, chat, screenshots, or commits.

## AI behavior and data

The AI tutor combines lexical retrieval with optional semantic reranking over the authenticated student's loaded StudySpace context. Gemini embeddings are cached per user and content hash. AI feedback is a quality signal for future human-reviewed evaluation; it does not automatically train model weights. Do not use private student content as a training dataset without explicit, informed consent and a privacy review.

## Deployment

Vercel deploys from the configured Git branch. A Git commit alone does not prove production is healthy: verify the deployment reaches **Ready**, then complete the manual launch smoke tests. See `docs/INITIAL_LAUNCH_CHECKLIST.md`.
