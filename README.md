# StudySpace

**A calmer place to manage student life.**

StudySpace brings academic planning and study tools into one workspace. Organize courses, assignments, notes, quizzes, flashcards, deadlines, and study sessions, with AI assistance available where it helps.

## What you can do

- **Dashboard** — see your academic workspace and upcoming work.
- **Courses and assignments** — organize course information, coursework, deadlines, submissions, and feedback.
- **AI Tutor** — ask questions and get explanations grounded in supported workspace material when that context is available.
- **Quizzes and flashcards** — create practice material and review what you have learned.
- **Notes and resources** — keep study material in one place and reuse it as learning context.
- **Homework and syllabus tools** — upload supported files, get assistance with coursework, and extract potential dates from syllabus text or documents.
- **Calendar and study planner** — coordinate deadlines, events, and study sessions.
- **Grades and progress** — keep track of entered grades and study goals.
- **Study groups** — organize learning with other students.
- **Admin tools** — provide authorized administrators with operational views.

AI-generated explanations, dates, questions, and feedback can be incorrect. Check important results against your course instructions and official materials.

## Built with

- Next.js and React
- TypeScript
- Supabase Auth, PostgreSQL, and Storage
- Google Gemini through server-side API routes
- Tailwind CSS and Lucide icons
- Vercel for deployment

## Run locally

Use a current Node.js LTS release.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a local `.env.local` file with the configuration needed for the features you want to run. Keep secret values in local environment files or the hosting provider's server-side environment settings; do not commit them to Git.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key |
| `GEMINI_API_KEY` | Server-side AI provider access |
| `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` | Server-side privileged Supabase operations, where required |
| `APP_ORIGIN` | Optional canonical application origin for supported flows |

Only configure the variables required by the features you are running. Values prefixed with `NEXT_PUBLIC_` are exposed to the browser and must never contain secrets.

## Useful commands

```bash
npm run lint
npm run test:retrieval
npm run test:syllabus
npx tsc --noEmit
npm run build
npm audit --audit-level=high
```

## Project structure

- `src/app` — application pages and API routes
- `src/lib` — shared application logic, AI retrieval, and integrations
- `supabase/migrations` — database schema and access-control changes
- `docs` — developer notes, operational guides, and release checklists
- `.github/workflows` — automated checks and scheduled workflows

## Development and contributions

Make changes in a feature branch when practical, run the relevant checks, and review database migrations before applying them to a live project. Test authentication, permissions, file access, and core student workflows in a non-production environment before releasing changes to users.

For operational procedures, consult the guides in the `docs` directory.
