# StudySpace off-site backup — future plan

## Overview

StudySpace has a repository workflow intended to support encrypted off-site backups. The long-term design may use a separate private storage destination, but that service is not currently enabled for the beta.

## Current decision

Cloudflare R2 setup is deferred until after the controlled beta and will be considered only if the project budget and expected usage justify it. No paid storage service is required for the current decision to defer R2.

## Requirements before relying on off-site backups

Before the future off-site option is considered operational, the project must:

1. Configure the storage destination securely.
2. Verify that a backup completes and contains the expected encrypted data.
3. Check archive integrity.
4. Restore into a separate, non-production environment.
5. Test essential application behavior and access boundaries after restoration.
6. Document the outcome without publishing student data or operational secrets.

A completed upload is not the same as a verified recovery.

## Privacy and security

Backup archives may contain private coursework and account metadata. Keep storage private, restrict access to the minimum necessary, protect encryption keys separately, and never commit credentials or private keys to this repository.

This public note intentionally omits service account identifiers, secret names, bucket configuration, encryption-key handling procedures, exact object paths, retention implementation, and step-by-step setup instructions.

**Status:** Future enhancement; not currently enabled.