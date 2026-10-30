# StudySpace

**A calmer place to manage student life.**

StudySpace is a student workspace for organizing academic work and using AI-assisted study tools in one place.

## Features

- **Dashboard** — an overview of academic activity and upcoming work.
- **Courses, notes, and resources** — organize learning materials.
- **Assignments** — manage coursework, submissions, and feedback.
- **AI Tutor** — ask academic questions and get explanations.
- **Quizzes and flashcards** — practise and review topics.
- **Homework and syllabus tools** — work with supported files and extract possible dates from syllabus content.
- **Calendar and study planner** — organize events, deadlines, and study sessions.
- **Grades and progress** — track entered grades and study goals.
- **Study groups** — support collaborative learning.
- **Administration** — authorized administrative views.

AI-generated explanations, dates, questions, and feedback can be wrong or incomplete. Verify important results against course instructions and official materials. StudySpace is a study aid, not a replacement for instructors or institutional guidance.

## Beta status

StudySpace is currently being evaluated in a **controlled beta**. Features, reliability, and workflows are still being tested and improved. Availability during beta may change, and users should keep their own copies of important coursework.

The project is being developed with privacy and responsible handling of student data in mind. Security and reliability checks are ongoing; this README is not a security certification or a guarantee that every workflow has been independently tested.

## Technology

- Next.js, React, and TypeScript
- Supabase for authentication, database, and file storage
- Google Gemini for AI-assisted features
- Tailwind CSS and Lucide icons
- Vercel for deployment
- GitHub Actions for automated checks

## Run locally

Use a current Node.js LTS release.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure the environment required for the features you want to run using your own development accounts. Keep credentials in local environment files or the hosting provider's protected settings. Never commit real credentials, private keys, or production data to the repository.

## Development checks

```bash
npm run lint
npm run test:retrieval
npm run test:syllabus
npm run test:security
npx tsc --noEmit
npm run build
npm audit --audit-level=high
```

Passing automated checks does not replace testing the deployed application with test accounts.

## Project layout

- `src/app` — application pages and API routes
- `src/lib` — shared application logic and integrations
- `supabase/migrations` — database schema changes
- `docs` — public project, beta, AI, and reliability notes
- `.github/workflows` — automated checks and workflow definitions

## Public project notes

- [Beta and reliability overview](docs/INITIAL_LAUNCH_CHECKLIST.md)
- [Security review summary](docs/SECURITY_TEST_REPORT_2026-10-28.md)
- [AI feature overview](docs/AI_ENGINE_ROADMAP.md)
- [AI quality and performance overview](docs/AI_LATENCY_AND_MODEL_ROUTING.md)
- [AI evaluation overview](docs/AI_MODEL_CATALOG_AND_TESTING.md)
- [Backup and recovery status](docs/BACKUP_AND_RECOVERY_RUNBOOK.md)

Detailed operational procedures and private configuration should be maintained outside this public repository.

## Development and contributions

Use feature branches when practical, review changes before merging, and test authentication, permissions, file handling, and core student workflows in a non-production environment. Report problems through the project's maintainer or the support channel provided to beta participants.
