# StudySpace beta operations runbook

## Monitoring configured
- GitHub Actions checks production liveness and database readiness every 15 minutes.
- /api/health is a dependency-free liveness check; /api/health/ready verifies database connectivity without exposing credentials or user data.
- AI Tutor logs request duration, time-to-first-token, context-load duration, retrieval wait, and streaming failures.
- The shared Gemini generation path records task, provider, model, attempt duration, success/failure, and provider-reported input/output/total token counts. Note extraction and grading also emit request-level outcome and duration events. Logs omit prompts, completions, user IDs, and filenames.
- Existing AI quota and global budget limits are usage guardrails. Request counts are not dollar-cost measurements.

## Where to look
1. GitHub → Actions → StudySpace uptime check.
2. Vercel → StudySpace project → Logs for runtime errors and structured studyspace_ai_request events.
3. Supabase dashboard → usage and logs for database/storage capacity and service errors.
4. StudySpace Admin → AI usage for request counts and quota utilization.

## Incident response
1. Confirm impact using the public site, /api/health, /api/health/ready, recent Vercel deployments, and Supabase status/logs.
2. Contain: disable the affected AI feature through existing server-side configuration or quota controls if a provider is failing or spend spikes. Never expose provider credentials in client code.
3. Protect student work. Do not delete submissions, notes, or uploads during investigation. Preserve timestamps and non-sensitive error references.
4. Communicate the affected feature, workaround, and next update time to affected beta users. Never include another student's data.
5. Recover by rolling back the last known-bad deployment or following the approved recovery procedure.
6. Verify health/readiness and run synthetic student workflows. Confirm data isolation.
7. Record cause, impact window, mitigation, and a preventive action; remove temporary elevated access.

## Severity guide
- P0 Critical: suspected cross-student exposure, credential compromise, or loss/corruption of student work. Restrict access immediately, preserve evidence, and notify affected parties as legally required.
- P1 Major: login/database unavailable or core course/assignment workflows unusable for most students.
- P2 Degraded: one AI specialist, upload format, or secondary feature unavailable.
- P3 Minor: cosmetic or isolated non-blocking defect.

## AI quality and cost monitoring
- Review request counts, quota use, provider errors, duration, and Tutor time-to-first-token daily during beta.
- Do not infer spend from request count. Token counts and provider/model attribution are logged for Gemini text/multimodal generation; dollar-cost reporting still requires applying Google's current per-model token and media pricing, and other provider-specific billing units.
- Investigate repeated failures, unusually long requests, quota spikes, and low-confidence grading feedback.
- Current structured metrics intentionally omit prompts, completions, student identifiers, and filenames.

## Beta feedback
Use the error-page Report a bug link or the repository beta bug-report issue template. Do not request passwords, tokens, real coursework, grades, or another student's personal information.

## Release checklist
- [ ] Latest scheduled uptime checks are green.
- [ ] Vercel deployment is healthy with no unresolved high-severity runtime errors.
- [ ] Supabase database and storage usage are within expected limits.
- [ ] AI quota and global budget controls are enabled.
- [ ] Synthetic tutor, notes, quiz, flashcard, recommendation, and grading checks pass.
- [ ] Mobile checks are complete on supported screen sizes.
- [ ] Privacy notice and terms are reviewed and approved before inviting additional students.