# StudySpace backup and recovery — public status

This document is a public overview, not an operational runbook. Detailed backup procedures, credential names, infrastructure configuration, encryption-key handling instructions, and recovery commands belong in a private operations document.

## Current approach

StudySpace uses an encrypted automated backup workflow for application data, private uploads, and Auth account metadata. Paid off-site object storage remains deferred until after beta and will only be considered if the project budget permits.

## Recovery status

**Verified — 2026-10-30**

A full encrypted-backup restoration was completed successfully on 2026-10-30 in an isolated, non-production environment.

The successful drill verified:
- The encrypted backup artifact could be retrieved and its manifest checked.
- The separately stored recovery identity successfully decrypted the backup.
- Storage payloads and Auth metadata were extracted and validated.
- The PostgreSQL application archive, roles, constraints, indexes, and policies restored successfully.
- Student-data RLS isolation tests passed against the restored database.
- The restored database, Auth metadata, and Storage payloads passed verification.
- Decrypted temporary material was removed and the isolated environment was stopped.

[View the successful GitHub Actions restoration run](https://github.com/ShrikrishnaSwami/StudySpace/actions/runs/41140126890).

This verifies the tested backup and restoration path; it does not guarantee that every future backup will be valid. Continue monitoring scheduled backups and periodically repeat restoration drills.

## General safeguards

- Protect backup access and encryption keys.
- Never store unencrypted student data in public locations.
- Do not place credentials, private keys, student records, or detailed recovery instructions in this public repository.
- Monitor automated backup results and investigate failures.
- Test restoration away from production before relying on a backup for recovery.
- Review retention and storage limits before choosing a long-term destination.
- Keep independent copies of important coursework while the beta is underway.

## Status

- Controlled beta: underway.
- Paid off-site storage: deferred.
- Encrypted backup workflow: operational.
- Isolated encrypted restoration drill: passed on 2026-10-30.

This page intentionally excludes infrastructure identifiers, secret names, detailed backup paths, permissions, retention implementation, and step-by-step restoration instructions.
