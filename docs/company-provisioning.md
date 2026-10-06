# Company Provisioning

## Purpose
This workflow lets the SafetyXP platform owner create the first company and first company administrator without exposing a public signup flow.

## Preferred MVP Flow
1. Platform owner runs the provisioning command on the server.
2. The script creates the company row in Supabase.
3. The script creates the initial admin Auth user.
4. The script creates the admin profile with `role = admin` and the correct `company_id`.
5. The script generates a secure invite/password setup link.
6. The invitation email is sent through the configured email provider.
7. The admin follows the link, sets a password, and logs in.
8. Middleware and profile lookups send the admin to `/admin/dashboard`.

## Command
```bash
npm run provision-company
```

The command is interactive by default so it works cleanly on Windows.

Example prompts:
```text
Company name: Example Mining Ltd
Industry: Mining
Admin first name: Jane
Admin last name: Smith
Admin email: jane@examplemining.com
Timezone: Africa/Johannesburg
```

You can also pass values as flags:
```bash
npm run provision-company -- --company="Example Mining Ltd" --industry="Mining" --adminFirstName="Jane" --adminLastName="Smith" --adminEmail="jane@examplemining.com" --timezone="Africa/Johannesburg"
```

## Required Server Environment
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_APP_URL`

Optional email settings:
- `EMAIL_PROVIDER=resend` (production only)
- `RESEND_API_KEY` (server-side secret)
- `RESEND_FROM_EMAIL` (must be a verified production sender address)

Development/test behavior:
- `EMAIL_PROVIDER=mock` is supported for local or test environments.
- The mock provider remains available for safe local development behavior.

Production behavior:
- `EMAIL_PROVIDER` must be exactly `resend`.
- `RESEND_API_KEY` must be set in the server environment.
- `RESEND_FROM_EMAIL` must be configured to a verified sender on the production domain.
- `onboarding@resend.dev` is suitable only for Resend development/testing and is not a production sender for real end-user recipients.

## Duplicate Protection
- Existing company names are detected before a new company is created.
- Existing admin email addresses are detected before a new Auth user is created.
- Re-running the script is intended to be safe when recovering from a partial failure.

## Partial Failure Recovery
- If company creation fails before the admin is created, the script rolls back the orphaned company when possible.
- If the admin Auth user exists but the profile is missing, rerunning the script will reuse the existing user and finish provisioning.
- If the invitation email fails, rerun the command after fixing email configuration; the company and admin records are preserved.

## Admin Invitation Flow
- The script generates a secure Supabase invite or recovery link.
- The link is sent to the admin email address.
- The admin lands in the existing auth confirmation flow and then sets a password.

## Revoking Access
- Disable or delete the Auth user in Supabase.
- Remove or update the profile record if needed for cleanup.
- Existing RLS policies prevent cross-company access once the identity is removed.

## Credential Rotation
- Rotate `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in the server environment first.
- Re-run the provisioning script only after the new secret is deployed.
- Never paste service-role keys into browser-accessible files or client-side code.

## Audit Trail
The provisioning flow records these events when possible:
- `Company Created`
- `Initial Admin Provisioned`
- `Admin Invitation Created`
- `Admin Password Created`
- `Provisioning Failed`
- `Provisioning Recovery`
