# Production Security Checklist

## Authentication
- Sessions validated server-side using Supabase Auth.
- No auth tokens persisted in localStorage.
- Expired/invalid sessions return safe unauthorized responses.
- Password reset and email verification flows validated.

## Authorization
- Admin API routes require authenticated admin or super_admin roles.
- Employee access restricted to employee-scoped records.
- No client-side role assertions trusted by server.

## RLS and Tenant Isolation
- RLS enabled for all company-owned tables.
- SELECT/INSERT/UPDATE/DELETE policies validated.
- Cross-company access tests executed and denied.

## Storage Security
- Buckets are private unless explicitly required otherwise.
- Storage object access mapped to authenticated tenant membership.
- Certificate reads restricted to owner or same-company admins.

## Secrets
- No service keys in client bundles.
- Production secrets configured separately from development/preview.
- .env* files ignored and not committed.

## AI Security
- Only admins can trigger generation/review/publish actions.
- AI generation is idempotent and rate-limited.
- AI outputs are schema-validated and human-reviewed before publish.

## Email Security
- Resend API key server-only.
- Invitation/reset links use secure tokens.
- No internal secrets in email URLs.

## Cron Security
- CRON_SECRET required for all cron endpoints.
- Missing/invalid secret denied.
- Cron responses do not leak internals.

## Rate Limiting
- Sensitive endpoints limited server-side.
- Retry-After responses returned on burst abuse.
- Rate limit scope and limitations documented.

## Headers and Browser Protections
- CSP configured with required service exceptions.
- HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy set.
- Frame embedding denied.

## Logging and Monitoring
- Security events captured in audit logs.
- Secrets and tokens excluded from logs.
- Alerting path defined for auth failures and job failures.

## Dependencies
- npm audit executed before release.
- Critical/high vulnerabilities triaged and tracked.

## Environment Separation
- Distinct Supabase and Vercel environments for dev/preview/prod.
- No production secrets in non-production deployments.

## Incident Response
- Incident playbook reviewed: docs/incident-response.md.
- On-call contacts and escalation tree verified.

## Backup and Recovery
- Backup capabilities verified against production RPO/RTO.
- Restore runbook validated: docs/disaster-recovery.md.
