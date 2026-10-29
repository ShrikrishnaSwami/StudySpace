# StudySpace backup and recovery runbook

## Current status

The repository includes two backup paths: a no-cost encrypted GitHub Actions artifact workflow and an optional manual Cloudflare R2 workflow. The free workflow is **not active until the required GitHub Actions secrets are configured and the first run succeeds**. It retains artifacts for seven days and is only an interim recovery buffer. Recovery remains unverified until a separate non-production restore drill passes. Follow [`FREE_BACKUP_INTERIM.md`](./FREE_BACKUP_INTERIM.md) for the free setup and restore procedure; use [`OFFSITE_BACKUP_SETUP.md`](./OFFSITE_BACKUP_SETUP.md) if a separate R2 destination is configured later.

Supabase's current backup guide says Pro, Team, and Enterprise projects receive daily database backups; it recommends regular logical exports for Free projects. Database backups do not include Storage API file objects. See https://supabase.com/docs/guides/platform/backups.

## What must be backed up

1. **PostgreSQL schema and data:** tables, indexes, functions, policies, and required data.
2. **Storage files:** separately export the contents of the private assignment-files, assignment-submissions, and homework buckets. A database dump alone only captures Storage metadata.
3. **Migration history and application code:** already versioned under supabase/migrations/ and GitHub; keep the repository accessible independently of the live project.
4. **Configuration inventory:** record required environment-variable names and auth/storage settings. Never put secret values in GitHub or the backup report.
5. **Auth and admin configuration:** document the trusted admin app_metadata.role assignment process. A database dump is not a substitute for testing that users can sign in after recovery.

## Create an off-site backup

Use the free automated pipeline in [`FREE_BACKUP_INTERIM.md`](./FREE_BACKUP_INTERIM.md). It exports the `public` application schema/data, the private `assignment-files`, `assignment-submissions`, and `homework` buckets, plus limited Auth user metadata; encrypts archives with age; uploads encrypted files to a private GitHub Actions artifact; and retains that artifact for seven days. The optional R2 workflow is manual-only unless deliberately configured.

- Keep every credential in GitHub Actions Secrets; never commit secrets or paste them into chat.
- Keep the age private key offline in at least two secure places. The public recipient is safe to store as a GitHub Actions secret; the private key must never be uploaded.
- Confirm the workflow run is green and the encrypted objects exist in R2.
- Do not treat an upload as proof of recoverability. Complete the restore drill below first.
- The pipeline does not export password hashes, sessions, provider secrets, all Auth settings, or all Supabase-managed schemas. Plan account password resets and configuration recovery.

## Restore drill (use a separate test project)

1. Create or select a non-production Supabase project with compatible PostgreSQL version/extensions.
2. Restore the SQL dump using the current Supabase CLI/database instructions. Never test restore by overwriting production.
3. Apply/verify migration history and confirm all expected public tables have RLS enabled.
4. Restore Storage objects to private buckets and compare object counts/checksums.
5. Test login, guest isolation, student-owned rows, AI grading authorization and grade integrity, admin RPC denial for non-admin users, and signed file access.
6. Run the repository checks: npm ci, npm run lint, npm run test:retrieval, npx tsc --noEmit, npm run build.
7. Record which checks passed and any data/configuration that was not recoverable.

## Incident recovery

- **Bad application release:** inspect Vercel deployment history and roll back to the last known-good deployment. Confirm the rollback serves the intended commit and re-test login, AI routes, assignments, submissions, and admin denial paths.
- **Bad schema migration or data loss:** pause writes if needed, preserve logs and the current state, restore to a separate project first, validate data, and plan downtime before any production restore. Database restoration can cause downtime and may lose changes after the selected backup.
- **Missing uploaded files:** restore from the separately archived Storage export; a database restore does not recover deleted Storage objects.
- **Compromised secret:** rotate the affected key at its source, update Vercel environment variables, redeploy only after tests pass, and invalidate sessions/credentials where appropriate.

## Required before public beta

- [ ] Confirm the actual Supabase plan and whether managed backups are available.
- [ ] Configure the daily free encrypted GitHub Actions artifact backup and verify a successful run.
- [ ] Keep an additional encrypted copy outside the GitHub account when feasible; seven-day artifact retention is only an interim buffer.
- [ ] Complete one successful restore drill in a non-production project using both encrypted archives.
- [ ] Set an owner and a recurring backup/restore-check cadence.
- [ ] Keep the latest successful restore timestamp and checksums in a secure operations record.
