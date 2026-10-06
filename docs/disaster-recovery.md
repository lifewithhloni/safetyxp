# Disaster Recovery

## Scope
This document defines backup and restore expectations for SafetyXP production data hosted on Supabase and deployed on Vercel.

## Backup Strategy
- Primary data store: Supabase Postgres.
- Baseline protection: Supabase automated backups (availability depends on selected plan).
- Optional stronger posture: enable Point-in-Time Recovery (PITR) in production environments where lower RPO is required.
- Artifact storage: Supabase Storage buckets for policy documents, certificates, and company assets.
- Configuration backup: version-controlled migrations and infrastructure configuration in Git.

## Verification Requirements
- Confirm current Supabase plan backup behavior before production launch.
- Record verified RPO and RTO values in runbook metadata.
- Run restore drill at least quarterly in a non-production environment.

## Restore Process
1. Declare incident and freeze high-risk writes.
2. Identify restore point using incident timeline.
3. Restore database from latest valid snapshot or PITR target.
4. Validate critical tables and tenant boundaries.
5. Validate storage object availability and policy enforcement.
6. Rotate potentially exposed secrets.
7. Re-enable traffic after verification checks pass.

## Who Can Restore
- Only designated production operators with least-privilege access.
- Restore actions require two-person approval (operator + incident commander).

## Accidental Deletion Response
- Contain deletion source (credential disablement, token revocation).
- Restore affected tables/objects from backup or PITR.
- Audit impacted tenants and notify stakeholders.

## Security Incident Response Linkage
- For malicious access, follow docs/incident-response.md first.
- Restore only after containment and credential rotation steps are complete.

## Post-Restore Checklist
- Verify auth flows.
- Verify RLS isolation tests on sample cross-tenant cases.
- Verify certificate download authorization.
- Verify cron jobs and AI jobs are idempotent after recovery.
- Capture post-incident review and corrective actions.
