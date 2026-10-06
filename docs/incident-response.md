# Incident Response

## Severity Model
- SEV-1: active cross-tenant exposure, credential compromise, large-scale integrity risk.
- SEV-2: limited unauthorized access, high-risk abuse, partial service impact.
- SEV-3: low-impact security issue without confirmed exploit.

## Core Response Workflow
1. Detect and triage.
2. Contain and isolate.
3. Rotate credentials and revoke sessions.
4. Investigate and scope blast radius.
5. Recover service safely.
6. Notify stakeholders and affected tenants when required.
7. Complete post-incident review.

## Playbooks

### Leaked API Key
- Disable compromised key immediately.
- Issue replacement key and update environment variables.
- Redeploy affected services.
- Review logs for key misuse window.

### Compromised Employee Account
- Revoke active sessions.
- Force password reset and MFA reset if applicable.
- Review user actions and data access.

### Compromised Admin Account
- Disable account and revoke sessions immediately.
- Review role and configuration changes.
- Validate no cross-tenant reads/writes occurred.

### Cross-Tenant Access Incident
- Freeze affected APIs/routes.
- Run targeted isolation tests against impacted tenants.
- Patch policy or authorization gaps.
- Notify affected companies per legal requirements.

### Malicious Document Upload
- Quarantine uploaded object.
- Block associated pipeline job.
- Re-run document validation controls.

### AI Misuse
- Disable AI generation endpoint for affected tenant if needed.
- Review usage records, job trails, and approval history.
- Apply stricter quotas or temporary lockout.

### Email Abuse
- Pause outbound email queue for affected tenant.
- Revoke invitation/reset links issued during abuse window.
- Rotate provider key if compromise suspected.

### Database Corruption
- Follow restore plan in docs/disaster-recovery.md.
- Validate referential integrity and RLS policy status post-restore.

### Certificate Fraud
- Revoke fraudulent certificates.
- Regenerate with audit trail.
- Review verification endpoint access patterns.

## Communication
- Incident commander owns status updates.
- Maintain internal timeline with UTC timestamps.
- Preserve forensic evidence for compliance/legal review.

## Recovery Validation
- Authentication and authorization tests pass.
- RLS/tenant isolation checks pass.
- Cron and automation jobs stable.
- AI and certificate endpoints audited.

## Post-Incident Review
- Document root cause, contributing factors, and missed detections.
- Track corrective actions with owners and deadlines.
- Add regression tests for discovered gap.
