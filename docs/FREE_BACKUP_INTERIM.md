# StudySpace interim backup — public overview

StudySpace has an encrypted backup workflow in the repository intended to provide a temporary option while the project is in beta.

## Current status

The workflow's presence in source control does not prove that it has completed successfully or that a recovery can be performed. A successful run and a separate non-production restore test are required before the backup process can be described as verified.

Cloudflare R2 is not currently part of the beta backup plan. Paid off-site storage is deferred until after beta and depends on future budget and usage.

## Important limitations

- Artifact storage has service-specific size, availability, and retention limits.
- An artifact stored under the same repository account is not fully independent of that account.
- Some identity-provider settings and session information may not be recoverable from a data export.
- Backups can contain sensitive student information and must remain encrypted and access-restricted.
- Keep independent copies of important academic work while the beta is running.

## Operational privacy

This public document intentionally does not include secret names, infrastructure identifiers, key-generation instructions, recovery commands, detailed workflow internals, or credentials. Maintain any step-by-step setup and restore procedure in a private operations location.

**Status:** Interim approach documented; successful execution and restoration are not claimed here.
