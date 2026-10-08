# Company Admin Employee Provisioning

Company Admins can create employee accounts manually or import a CSV from the
Employees page. Employees do not self-register. The server derives company
membership from the authenticated admin profile; a company ID is never accepted
from the browser.

Manual employee creation can select an existing department or create one. New
department names are trimmed and matched case-insensitively within the admin's
company. A unique expression index prevents concurrent duplicate department
creation; if the migration detects existing case/whitespace duplicates, resolve
those records before applying it.

## Manual creation

The admin supplies first name, last name, and email, with optional employee
number, job title, and department. Departments are loaded for the admin's
company and checked again on the server before creation.

The server creates an unconfirmed Supabase Auth user, inserts its employee
profile, generates an Auth invitation link, and persists the link token hash in
`employee_invitations`. The invitation is associated with the new profile,
company, and inviting admin. On failure, the server revokes any persisted
invitation and removes the Auth user (which cascades to its profile); cleanup
failures are reported rather than treated as success.

## CSV import

CSV headers must include `First Name`, `Last Name`, and `Email`. The optional
headers are `Employee Number`, `Job Title`, and `Department`. Quoted values,
embedded commas, and escaped quotes are supported. Imports are limited to 500
rows and 2 MB.

Preview parses and validates the complete file, checks in-file duplicates,
existing company employees, and company departments, and performs no writes.
After confirmation, the server repeats validation and provisions ready rows
sequentially. A failure for one row does not discard successfully provisioned
rows; the result includes created, invitation, skipped, and error counts with
row-level errors.

## Invitation and password setup

Invitations expire after seven days. The generated Auth invite link passes
through `/auth/confirm`, which accepts only a persisted, pending, unexpired
invitation. The employee sets a password on `/reset-password`; activation is
then recorded as `ACCEPTED`. Expired invitations are marked `EXPIRED`, and
revoked or otherwise invalid invitations cannot be accepted. After setup, the
employee signs in; the existing role-aware root redirect sends employees to
`/today`.

Email is sent through the configured SafetyXP email provider abstraction.
The mock provider is intentionally non-delivering and is reported as such in
the UI. Production continues to use the existing Resend configuration.

The existing `employee_invitations` schema supports this flow, so this feature
does not require a database migration.
