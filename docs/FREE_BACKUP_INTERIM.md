# Free encrypted backup interim plan

This is the no-new-paid-service backup option for StudySpace. It uses a scheduled GitHub Actions workflow to export the app database, private Storage objects, and limited Auth metadata, encrypts the sensitive archives with age before upload, and stores the encrypted files as a private GitHub Actions artifact.

## What is automated

- Daily scheduled run at 06:17 UTC and a manual **Run workflow** option.
- PostgreSQL application-schema dump plus Storage object and Auth metadata exports.
- Encryption before upload; the age private key is never needed by the workflow.
- SHA-256 manifest for the encrypted archive files.
- Artifact upload verification by the GitHub Actions artifact service.
- Admin dashboard status update and failure status when the workflow can reach Supabase.
- Seven-day artifact retention to limit free storage use.

## Important limitations

- The artifact expires after seven days. This is a short-term recovery buffer, not long-term archival.
- GitHub and the repository owner account are still a shared failure domain. This is not as independent as a separate backup provider or a physically separate drive.
- A successful upload is not proof that a restore works.
- The workflow cannot be operational until the required repository secrets are added and a manual run succeeds.
- The export does not include password hashes, sessions, refresh tokens, provider credentials, or every Supabase Auth setting. Account recovery may require password resets and reconfiguration.
- GitHub's included artifact storage/usage limits can change. Keep the archive small, review repository Actions usage, and do not assume unlimited free storage.

## Set up the free workflow

1. On a trusted computer, install age from the [official releases](https://github.com/FiloSottile/age/releases). Create a key pair:
   ```powershell
   age-keygen.exe -o studyspace-backup-key.txt
   ```
2. Copy only the public recipient beginning with `age1...` into the repository Actions secret `BACKUP_AGE_RECIPIENT`. Keep the private key in an encrypted password manager and a separate secure offline copy. Never upload the private key.
3. Open [StudySpace repository Actions secrets](https://github.com/ShrikrishnaSwami/StudySpace/settings/secrets/actions) and add:
   - `BACKUP_SUPABASE_URL`: production Supabase project URL
   - `BACKUP_SUPABASE_SERVICE_ROLE_KEY`: server-only service-role/secret key with the access needed to export private Storage and Auth metadata
   - `BACKUP_SUPABASE_DB_URL`: PostgreSQL connection URL for the production project
   - `BACKUP_DB_PASSWORD`: database password used by pg_dump
   - `BACKUP_AGE_RECIPIENT`: age public recipient only
4. Open **Actions → StudySpace encrypted free backup artifact** and run it manually before relying on the schedule.
5. Confirm every workflow step succeeds. Open the run's Artifacts section and confirm the encrypted backup artifact contains `public-database.dump.age`, `storage-and-auth.tar.gz.age`, and `manifest.json`. The admin dashboard should show the latest run status.
6. Download the encrypted artifact to a trusted computer and complete the restore drill below in a separate non-production Supabase project.

## Restore drill

Do not restore over production.

1. Download and extract the artifact ZIP to a trusted computer. Keep the original encrypted files unchanged.
2. Decrypt the database archive with the offline private key:
   ```powershell
   age --decrypt --identity .\\studyspace-backup-key.txt --output public-database.dump .\\public-database.dump.age
   ```
3. Decrypt the Storage/Auth archive:
   ```powershell
   age --decrypt --identity .\\studyspace-backup-key.txt --output storage-and-auth.tar.gz .\\storage-and-auth.tar.gz.age
   tar -xzf storage-and-auth.tar.gz
   ```
4. Restore the database dump into a separate compatible Supabase test project using the current Supabase database restore instructions. Apply and verify the project's migrations and RLS policies; the dump is not a byte-for-byte clone of all managed Supabase schemas.
5. Restore the private Storage objects into private buckets in that test project. Treat the Auth JSON as a metadata inventory only; it is not a way to restore passwords or active sessions.
6. Test login/account recovery, owner-only data access, cross-student isolation, uploads/downloads, assignment submissions, AI quotas, and admin authorization against the test project.
7. Record the date, archive hashes, restored commit, and pass/fail result without recording student content or secrets.

## The six-point operating check

- [ ] **Export:** database dump, private Storage objects, and limited Auth metadata all exist.
- [ ] **Encrypt:** the workflow encrypts the sensitive archives before upload.
- [ ] **Separate storage:** encrypted archives are stored in a private GitHub Actions artifact, separate from the live Supabase database but not independent of the GitHub account.
- [ ] **Separate key:** the private age key remains offline and separate from the artifact.
- [ ] **Schedule:** the daily workflow succeeds and repository notifications are monitored.
- [ ] **Restore test:** archives decrypt and restore into a separate test project, with app and access-control checks passing.

Until the first successful run and restore drill, report backups as **not yet verified**. For durable long-term backups, add a second independent destination when one is available.
