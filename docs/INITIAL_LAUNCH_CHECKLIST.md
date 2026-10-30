# StudySpace beta readiness — public overview

StudySpace is currently being evaluated through a controlled beta. This page describes broad readiness goals and is not a detailed internal security checklist.

## Current beta priorities

- Verify that signup, login, logout, and account recovery behave as expected.
- Test core student workflows, including courses, notes, assignments, submissions, grading, quizzes, uploads, and calendar activity.
- Check that each account can access only the information intended for it.
- Verify that administrative features are available only to authorized people.
- Test AI outputs, usage handling, and provider-error behavior.
- Review accessibility, mobile layouts, privacy information, and support/reporting channels.
- Run automated code-quality and application tests.
- Verify the currently deployed build rather than relying only on source-control status.
- Validate backups and recovery before describing them as reliable.

## Credentials and configuration

The maintainer reports that previously exposed provider credentials have been rotated. Credential values, environment-specific configuration, and operational verification details are not published here. Keep all real credentials outside source control and use the hosting provider's protected configuration.

## Backups

The project has an interim encrypted backup workflow in the repository. Its successful execution and recovery capability must be verified separately. Cloudflare R2 off-site storage is deferred until after beta.

Participants should keep their own copies of important work and report issues through the support channel provided to them.

## Release principle

A passing automated test or successful deployment does not establish that every user flow is secure or reliable. Continue testing with dedicated test accounts and address significant issues before broadening access.

This public checklist intentionally omits internal security architecture, exact control settings, service identifiers, deployment internals, detailed operational commands, and private incident information.
