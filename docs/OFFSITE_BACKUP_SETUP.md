# StudySpace encrypted off-site backups

## What this system does

The GitHub Actions workflow `.github/workflows/offsite-backup.yml` runs daily at 06:17 UTC and can also be run manually. It exports:

- PostgreSQL `public` application schema and data, including application tables, functions, and row-level security policies.
- Objects from the private `assignment-files`, `assignment-submissions`, and `homework` Storage buckets.
- A limited Auth user metadata export. Password hashes, sessions, refresh tokens, and provider credentials are not exportable; users may need password resets after a disaster restore.
- A SHA-256 integrity manifest.

Database and Storage/Auth archives are encrypted with age **before upload** to Cloudflare R2. Only encrypted archives are uploaded. The workflow verifies each uploaded object's byte size, fails on export/upload errors, and retains the latest seven calendar days of backups after a successful upload.

This is a backup pipeline, not a completed recovery drill. Do not mark recovery verified until you have successfully decrypted the files and restored them into a separate non-production Supabase project.

## Free accounts and setup

### 1. Create a Cloudflare R2 bucket

1. Sign up at https://dash.cloudflare.com/ (the R2 free tier currently includes 10 GB-month of Standard storage, 1 million Class A operations, 10 million Class B operations, and no egress fee; check the current pricing before relying on a free limit: https://developers.cloudflare.com/r2/pricing/).
2. In **R2 Object Storage**, create a private bucket named `studyspace-backups`. Do not enable public access.
3. Create an R2 API token scoped only to this bucket with object **read and write** permissions. Copy the Access Key ID and Secret Access Key once; never commit them or send them in chat.
4. Find the Cloudflare account ID in the dashboard.

### 2. Create an encryption key

Use a trusted computer and install age from its [official releases](https://github.com/FiloSottile/age/releases). On Windows, extract the release ZIP, open PowerShell in that folder, and run:

```powershell
.\age-keygen.exe -o studyspace-backup-key.txt
```

The command prints a public recipient beginning with `age1...`. Store only that public recipient as the GitHub Actions secret `BACKUP_AGE_RECIPIENT`. The file contains the private key; keep it offline and protected.

**Keep the private key beginning with `AGE-SECRET-KEY-1...` offline in at least two secure places** (for example, an encrypted password manager and a separate encrypted offline copy). Never put the private key in GitHub Actions, this repository, Vercel, or chat. If the private key is lost, the encrypted backups cannot be decrypted. Test decryption as part of the restore drill.

### 3. Add GitHub Actions secrets

Open the repository's **Settings → Secrets and variables → Actions → New repository secret** at https://github.com/ShrikrishnaSwami/StudySpace/settings/secrets/actions and add:

| Secret name | Value |
| --- | --- |
| `BACKUP_SUPABASE_URL` | The production Supabase Project URL (HTTPS). |
| `BACKUP_SUPABASE_SERVICE_ROLE_KEY` | Production server-side service-role/secret key. Keep it in GitHub Secrets only. |
| `BACKUP_SUPABASE_DB_URL` | PostgreSQL direct connection URL from Supabase **Connect**; use the database password securely. |
| `BACKUP_DB_PASSWORD` | Database password, if required by the URL/connection. Do not include it in the URL as well unless your connection provider requires that. |
| `BACKUP_AGE_RECIPIENT` | Public `age1...` recipient only, never the private key. |
| `BACKUP_R2_ACCOUNT_ID` | Cloudflare account ID. |
| `BACKUP_R2_BUCKET` | `studyspace-backups` (or your private bucket name). |
| `BACKUP_R2_ACCESS_KEY_ID` | R2 bucket-scoped Access Key ID. |
| `BACKUP_R2_SECRET_ACCESS_KEY` | R2 bucket-scoped Secret Access Key. |

The workflow expects `BACKUP_SUPABASE_DB_URL` to be a working direct PostgreSQL connection URL. The runner also sets `PGPASSWORD` from `BACKUP_DB_PASSWORD`; if the password is already embedded in the URL, use the same password in both secrets. Do not put secrets in workflow YAML or issue comments.

### 4. Run the first backup manually

1. Open **Actions → StudySpace encrypted off-site backup**.
2. Click **Run workflow** on `main`.
3. Open the run and confirm every step is green.
4. In Cloudflare R2, confirm the run's `studyspace/daily/YYYY/MM/DD/.../` prefix contains `public-database.dump.age`, `storage-and-auth.tar.gz.age`, and `manifest.json`.
5. Download the two `.age` files to a trusted computer and verify they decrypt with your private key. Confirm the manifest SHA-256 hashes after downloading.

A successful GitHub workflow and objects in R2 prove an export/upload completed; they do not prove a full restore will work.

## Restore drill (required)

Use a **separate non-production Supabase project**, never production, for the first restore.

1. Download both encrypted archives and `manifest.json` from the same run prefix.
2. Verify SHA-256 hashes from the manifest.
3. Decrypt locally:
   ```bash
   age --decrypt --identity studyspace-backup-key.txt --output public-database.dump public-database.dump.age
   age --decrypt --identity studyspace-backup-key.txt --output storage-and-auth.tar.gz storage-and-auth.tar.gz.age
   tar -tzf storage-and-auth.tar.gz
   ```
4. Restore the PostgreSQL custom-format dump to the test project's database using a compatible PostgreSQL client. Inspect `pg_restore --help` and the target project before running; never use `--clean` against production. Confirm all expected tables, functions, grants, and RLS policies exist.
5. Recreate required private buckets and bucket policies from the versioned migrations. Restore object files to the matching bucket/path, preserving their relative paths.
6. Use `auth-users.json` as an account metadata inventory. Auth accounts, password hashes, sessions, OAuth provider secrets, and Auth configuration are not fully restored by this export; plan a controlled account recovery/password reset and reconfigure Auth settings.
7. Run the application against the test project and validate login, owner-only data access, cross-student isolation, uploads/downloads, assignment submissions, AI quota, and admin authorization.
8. Record date, restored commit, object counts, and pass/fail results in the operations record. Do not put student data, private keys, or secrets in the report.

## Scope and limitations

- This is a logical export of the application's `public` schema plus separate Storage object and Auth metadata exports. It is not a byte-for-byte clone of the Supabase project and does not restore every Auth setting, session, provider secret, extension, or managed schema.
- The backup contains sensitive student coursework before encryption. Keep the R2 bucket private, restrict token scope, keep the age private key offline, and restrict access to GitHub Actions secrets and run logs.
- The free R2 allowance is not a guarantee that all usage remains free. Monitor storage growth and set billing alerts/limits where available. Backups larger than the included storage may cost money.
- The workflow deletes objects older than the latest seven calendar days only after a new backup uploads and verifies successfully. This limits storage growth, but it also limits the recovery window to roughly one week. The R2 token therefore needs delete permission on this dedicated backup bucket. If you need longer retention, configure it deliberately and check whether your storage use remains within the free allowance.
- A scheduled workflow can fail or be disabled. Check the Actions run history regularly and configure GitHub notifications.
- These exports do not prove that recovery works until the restore drill succeeds.
