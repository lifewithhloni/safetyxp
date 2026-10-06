# Admin Onboarding

## Overview
The first company administrator is provisioned by the SafetyXP platform owner through the server-side provisioning command, not through public signup.

## What the Admin Receives
The admin receives a secure invitation email with a password setup link.

## Acceptance Flow
1. Admin opens the invitation email.
2. The email link goes through `/auth/confirm`.
3. The app redirects the user to `/reset-password`.
4. The admin creates a password.
5. The admin signs in through `/login`.
6. Middleware and role checks send the admin to `/admin/dashboard`.

## Security Rules
- The admin does not choose a company.
- The admin does not choose a role.
- The admin cannot elevate to `super_admin` through the app.
- The admin cannot change `company_id` through the browser.
- The admin only sees data for their own company.

## Employee Onboarding After Admin Setup
1. Admin opens Employees.
2. Admin imports an HR CSV or adds employees individually.
3. The app derives `company_id` from the authenticated admin profile.
4. Employee invitations are sent from the company context.
5. Employees accept their own invitation and land on `/today`.

## Troubleshooting
- If the invitation email was not received, rerun the provisioning command after checking email provider configuration.
- If the auth user already exists but has no profile, rerun provisioning to complete the missing step.
- If the company already exists, the provisioning command should reuse it rather than create a duplicate.
