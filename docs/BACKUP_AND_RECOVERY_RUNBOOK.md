# StudySpace backup and recovery — public status

This document is a public overview, not an operational runbook. Detailed backup procedures, credential names, infrastructure configuration, encryption-key handling instructions, and recovery commands should be stored in a private operations document.

## Current approach

StudySpace is evaluating a no-additional-service-cost encrypted backup workflow using the repository's automation platform. Cloudflare R2 off-site storage is intentionally deferred until after beta and will only be considered if the project budget permits.

## Recovery status

A backup is not considered verified merely because an automated job completes. Recovery should only be described as verified after encrypted files have been checked and a restore has been successfully completed in a separate, non-production environment.

At the time of this update, this public summary does not claim that a full disaster-recovery exercise has passed. Keep independent copies of important coursework while the beta is underway.

## General safeguards

- Protect backup access and encryption keys.
- Never store unencrypted student data in public locations.
- Do not place credentials, private keys, student records, or detailed recovery instructions in this public repository.
- Monitor automated backup results and investigate failures.
- Test restoration away from production before relying on a backup for recovery.
- Review retention and storage limits before choosing a long-term destination.

## Status

- Controlled beta: underway.
- Paid off-site storage: deferred.
- Encrypted backup workflow: present in the repository; successful execution and restoration must be verified before claiming recovery readiness.

This page intentionally excludes infrastructure identifiers, secret names, detailed backup paths, permissions, retention implementation, and step-by-step restoration instructions.
