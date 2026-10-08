import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportServerError } from "@/lib/security/sentry-server";
import { getCompanyAdminSupabase, EmployeeAccessError } from "@/services/admin/employee-management.service";
import { sendTemplatedEmail } from "@/services/email/email.service";
import {
  previewEmployeeCsv,
  type EmployeeCsvData,
} from "@/services/admin/employee-import";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const maximumCsvBytes = 2_000_000;
const maximumCsvRows = 500;

export class EmployeeProvisioningError extends Error {
  constructor(
    readonly code: "invalid" | "duplicate" | "department" | "database" | "auth-conflict" | "email" | "cleanup",
    message: string
  ) {
    super(message);
    this.name = "EmployeeProvisioningError";
  }
}

type AdminProfile = {
  id: string;
  company_id: string;
  role: string;
};

type ManualEmployeeInput = EmployeeCsvData & {
  departmentId: string | null;
  newDepartmentName?: string | null;
};

type ProvisioningDiagnostic = {
  attemptId: string;
  stage: string;
  error: unknown;
  authUserCreated: boolean;
  profileCreated: boolean;
  invitationPersisted: boolean;
  emailSendingStarted: boolean;
  rollbackAttempted: boolean;
  rollbackCompleted: boolean;
  rollbackError?: unknown;
};

function safeDiagnosticValue(error: unknown) {
  const errorName = error instanceof Error
    ? error.name
    : error && typeof error === "object" && "name" in error && typeof error.name === "string"
      ? error.name
      : "Error";
  const errorMessage = error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "Unknown provisioning failure.";

  const safeName = errorName.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80) || "Error";
  const safeMessage = errorMessage
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/\b(?:sk|rk|re|sb_secret|sb_publishable)_[A-Za-z0-9_-]{8,}\b/gi, "[key redacted]")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[token redacted]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL redacted]")
    .replace(/(password|authorization|cookie|secret|token|api[_ -]?key|service[_ -]?role)(:|=)[^\s,;]+/gi, "$1$2[redacted]")
    .slice(0, 500);

  return { errorName: safeName, errorMessage: safeMessage };
}

function logProvisioningDiagnostic(diagnostic: ProvisioningDiagnostic) {
  const { errorName, errorMessage } = safeDiagnosticValue(diagnostic.error);
  const rollbackFailure = diagnostic.rollbackError
    ? safeDiagnosticValue(diagnostic.rollbackError)
    : undefined;
  const context = {
    component: "employee-provisioning",
    operation: "create_employee",
    failure_scope: diagnostic.stage,
    outcome: diagnostic.rollbackCompleted ? "rolled_back" : "rollback_incomplete",
    attempt_id: diagnostic.attemptId,
  };

  reportServerError(diagnostic.error, context);
  if (diagnostic.rollbackError) {
    reportServerError(diagnostic.rollbackError, {
      ...context,
      failure_scope: "rollback",
    });
  }

  console.error(JSON.stringify({
    event: "employee_provisioning_failed",
    attemptId: diagnostic.attemptId,
    stage: diagnostic.stage,
    errorName,
    errorMessage,
    authUserCreated: diagnostic.authUserCreated,
    profileCreated: diagnostic.profileCreated,
    invitationPersisted: diagnostic.invitationPersisted,
    emailSendingStarted: diagnostic.emailSendingStarted,
    rollbackAttempted: diagnostic.rollbackAttempted,
    rollbackCompleted: diagnostic.rollbackCompleted,
    ...(rollbackFailure ? { rollbackErrorName: rollbackFailure.errorName, rollbackErrorMessage: rollbackFailure.errorMessage } : {}),
  }));
}

function normalizeManualEmployee(input: ManualEmployeeInput): ManualEmployeeInput {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLocaleLowerCase();
  const employeeNumber = input.employeeNumber?.trim() || null;
  const jobTitle = input.jobTitle?.trim() || null;
  const departmentId = input.departmentId?.trim() || null;
  const newDepartmentName = input.newDepartmentName?.trim() || null;

  if (!firstName || !lastName || !email) {
    throw new EmployeeProvisioningError("invalid", "First name, last name, and email are required.");
  }
  if (firstName.length > 100 || lastName.length > 100 || email.length > 320) {
    throw new EmployeeProvisioningError("invalid", "Names must be 100 characters or fewer and email must be 320 characters or fewer.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new EmployeeProvisioningError("invalid", "Enter a valid email address.");
  }
  if (employeeNumber && employeeNumber.length > 100) {
    throw new EmployeeProvisioningError("invalid", "Employee number must be 100 characters or fewer.");
  }
  if (jobTitle && jobTitle.length > 150) {
    throw new EmployeeProvisioningError("invalid", "Job title must be 150 characters or fewer.");
  }
  if (input.newDepartmentName !== undefined && !newDepartmentName) {
    throw new EmployeeProvisioningError("invalid", "Enter a department name or select an existing department.");
  }
  if (newDepartmentName && newDepartmentName.length > 100) {
    throw new EmployeeProvisioningError("invalid", "Department name must be 100 characters or fewer.");
  }
  if (newDepartmentName && departmentId) {
    throw new EmployeeProvisioningError("invalid", "Select either an existing department or create a new one.");
  }

  return { ...input, firstName, lastName, email, employeeNumber, jobTitle, departmentId, newDepartmentName };
}

async function getCompanyEmployeeProfiles(companyId: string) {
  const profiles: Array<{ email: string; employee_number: string | null }> = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("email, employee_number")
      .eq("company_id", companyId)
      .eq("role", "employee")
      .range(start, start + pageSize - 1);
    if (error) {
      throw new EmployeeProvisioningError("database", "Could not load existing company employees.");
    }
    profiles.push(...(data ?? []));
    if (!data || data.length < pageSize) return profiles;
  }
}

async function assertNoCompanyConflict(
  companyId: string,
  employee: Pick<ManualEmployeeInput, "email" | "employeeNumber">
) {
  const profiles = await getCompanyEmployeeProfiles(companyId);

  const matchingEmail = profiles?.some(
    (profile) => profile.email.trim().toLocaleLowerCase() === employee.email
  );
  if (matchingEmail) {
    throw new EmployeeProvisioningError("duplicate", "An employee with this email already exists in your company.");
  }

  if (employee.employeeNumber) {
    const normalizedNumber = employee.employeeNumber.toLocaleLowerCase();
    const matchingNumber = profiles?.some(
      (profile) => profile.employee_number?.trim().toLocaleLowerCase() === normalizedNumber
    );
    if (matchingNumber) {
      throw new EmployeeProvisioningError("duplicate", "This employee number is already used in your company.");
    }
  }
}

async function assertDepartmentBelongsToCompany(companyId: string, departmentId: string | null) {
  if (!departmentId) return;

  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new EmployeeProvisioningError("database", "Could not verify the selected department.");
  }
  if (!data) {
    throw new EmployeeProvisioningError("department", "Select a department belonging to your company.");
  }
}

async function findCompanyDepartment(companyId: string, departmentName: string) {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("id, name")
    .eq("company_id", companyId);

  if (error) {
    throw new EmployeeProvisioningError("database", "Could not check company departments.");
  }
  return data?.find(
    (department) => department.name.trim().toLocaleLowerCase() === departmentName.toLocaleLowerCase()
  ) ?? null;
}

async function resolveOrCreateCompanyDepartment(companyId: string, departmentName: string) {
  const normalizedName = departmentName.trim();
  if (!normalizedName) {
    throw new EmployeeProvisioningError("invalid", "Enter a department name.");
  }

  const existing = await findCompanyDepartment(companyId, normalizedName);
  if (existing) return existing.id;

  const { data, error } = await supabaseAdmin
    .from("departments")
    .insert({ company_id: companyId, name: normalizedName })
    .select("id")
    .maybeSingle();

  if (!error && data) return data.id;
  if (error?.code === "23505") {
    const concurrent = await findCompanyDepartment(companyId, normalizedName);
    if (concurrent) return concurrent.id;
  }

  throw new EmployeeProvisioningError("database", "Could not create the department.");
}

function getApplicationUrl() {
  const applicationUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!applicationUrl) {
    throw new EmployeeProvisioningError("database", "Employee invitations are unavailable because the application URL is not configured.");
  }

  try {
    const parsed = new URL(applicationUrl);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error("Application URL must use HTTPS.");
    }
    return parsed.origin;
  } catch {
    throw new EmployeeProvisioningError("database", "Employee invitations are unavailable because the application URL is invalid.");
  }
}

async function compensateEmployeeCreation(userId: string, invitationId: string | null) {
  let invitationCleanupFailed = false;
  if (invitationId) {
    const { error } = await supabaseAdmin
      .from("employee_invitations")
      .update({ status: "REVOKED" })
      .eq("id", invitationId)
      .eq("status", "PENDING");
    invitationCleanupFailed = Boolean(error);
  }

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (!deleteUserError && !invitationCleanupFailed) return;

  let deleteProfileFailed = false;
  if (deleteUserError) {
    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);
    deleteProfileFailed = Boolean(deleteProfileError);
  }

  throw new EmployeeProvisioningError(
    "cleanup",
    deleteProfileFailed || invitationCleanupFailed
      ? "Employee setup failed and automatic cleanup was incomplete. Contact your SafetyXP administrator."
      : "Employee setup failed. The unused Auth account could not be removed; contact your SafetyXP administrator."
  );
}

async function provisionEmployeeForAdmin(
  admin: AdminProfile,
  untrustedInput: ManualEmployeeInput
) {
  if (admin.role !== "admin" && admin.role !== "super_admin") {
    throw new EmployeeAccessError("forbidden");
  }
  if (!admin.company_id) {
    throw new EmployeeAccessError("forbidden");
  }

  const employee = normalizeManualEmployee(untrustedInput);
  await assertNoCompanyConflict(admin.company_id, employee);
  const departmentId = employee.newDepartmentName
    ? await resolveOrCreateCompanyDepartment(admin.company_id, employee.newDepartmentName)
    : employee.departmentId;
  await assertDepartmentBelongsToCompany(admin.company_id, departmentId);

  const applicationUrl = getApplicationUrl();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: employee.email,
    email_confirm: false,
    user_metadata: {
      first_name: employee.firstName,
      last_name: employee.lastName,
    },
  });

  if (authError || !authData.user) {
    if (authError?.message.toLocaleLowerCase().includes("already")) {
      throw new EmployeeProvisioningError("auth-conflict", "An Auth account already exists for this email. Contact your SafetyXP administrator to resolve the existing account.");
    }
    throw new EmployeeProvisioningError("database", "Could not create the employee Auth account.");
  }

  const userId = authData.user.id;
  const attemptId = randomUUID();
  let invitationId: string | null = null;
  let stage = "profile_creation";
  let profileCreated = false;
  let invitationPersisted = false;
  let emailSendingStarted = false;

  try {
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      company_id: admin.company_id,
      email: employee.email,
      first_name: employee.firstName,
      last_name: employee.lastName,
      role: "employee",
      job_title: employee.jobTitle,
      department_id: departmentId,
      employee_number: employee.employeeNumber,
    });

    if (profileError) {
      throw new EmployeeProvisioningError(
        profileError.code === "23505" ? "duplicate" : "database",
        profileError.code === "23505"
          ? "The email or employee number is already in use."
          : "Could not create the employee profile."
      );
    }
    profileCreated = true;

    invitationId = randomUUID();
    const confirmUrl = new URL("/auth/confirm", applicationUrl);
    confirmUrl.searchParams.set("next", `/reset-password?invitation=${invitationId}`);
    stage = "invitation_link_generation";
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: employee.email,
      options: { redirectTo: confirmUrl.toString() },
    });

    if (linkError || !linkData.properties?.action_link || !linkData.properties.hashed_token) {
      throw new EmployeeProvisioningError("database", "Could not generate a secure employee invitation.");
    }

    const expiresAt = new Date(Date.now() + invitationLifetimeMs).toISOString();
    stage = "invitation_persistence";
    const { error: invitationError } = await supabaseAdmin.from("employee_invitations").insert({
      id: invitationId,
      company_id: admin.company_id,
      employee_id: userId,
      email: employee.email,
      token_hash: linkData.properties.hashed_token,
      expires_at: expiresAt,
      status: "PENDING",
      invited_by: admin.id,
    });

    if (invitationError) {
      throw new EmployeeProvisioningError("database", "Could not persist the employee invitation.");
    }
    invitationPersisted = true;

    stage = "email_provider_selection_and_send";
    emailSendingStarted = true;
    const delivery = await sendTemplatedEmail({
      to: employee.email,
      heading: "You're invited to SafetyXP",
      greeting: `Hello ${employee.firstName},`,
      message: "Your company has created your SafetyXP employee account. Open the invitation to create your password, then sign in to get started.",
      ctaLabel: "Create your password",
      ctaUrl: linkData.properties.action_link,
    });

    if (!delivery.success) {
      throw new EmployeeProvisioningError("email", "The invitation email could not be sent.");
    }

    return {
      employeeId: userId,
      email: employee.email,
      invitationId,
      invitationQueued: delivery.provider !== "mock",
      emailProvider: delivery.provider,
    };
  } catch (error) {
    let rollbackCompleted = false;
    let rollbackError: unknown;
    try {
      await compensateEmployeeCreation(userId, invitationId);
      rollbackCompleted = true;
    } catch (cleanupError) {
      rollbackError = cleanupError;
    }
    logProvisioningDiagnostic({
      attemptId,
      stage,
      error,
      authUserCreated: true,
      profileCreated,
      invitationPersisted,
      emailSendingStarted,
      rollbackAttempted: true,
      rollbackCompleted,
      ...(rollbackError ? { rollbackError } : {}),
    });
    if (rollbackError) {
      throw rollbackError;
    }

    if (error instanceof EmployeeProvisioningError || error instanceof EmployeeAccessError) {
      throw error;
    }
    throw new EmployeeProvisioningError(
      "database",
      `Employee setup failed and the created account was removed. Reference: ${attemptId.slice(0, 8)}`
    );
  }
}

async function loadAdminContext() {
  const { profile } = await getCompanyAdminSupabase();
  if (!profile.company_id) {
    throw new EmployeeAccessError("forbidden");
  }
  return profile as AdminProfile;
}

async function getCompanyEmployeeRows(companyId: string) {
  const profiles = await getCompanyEmployeeProfiles(companyId);

  const { data: departments, error: departmentsError } = await supabaseAdmin
    .from("departments")
    .select("id, name")
    .eq("company_id", companyId);
  if (departmentsError) {
    throw new EmployeeProvisioningError("database", "Could not load company departments for import validation.");
  }

  return {
    profiles,
    departments: departments ?? [],
  };
}

async function buildCsvPreview(companyId: string, csvText: string) {
  if (Buffer.byteLength(csvText, "utf8") > maximumCsvBytes) {
    throw new EmployeeProvisioningError("invalid", "CSV files must be 2 MB or smaller.");
  }

  try {
    previewEmployeeCsv(csvText, { departments: [], existingEmails: [], existingEmployeeNumbers: [] });
  } catch (error) {
    if (error instanceof Error) {
      throw new EmployeeProvisioningError("invalid", error.message);
    }
    throw error;
  }

  const { profiles, departments } = await getCompanyEmployeeRows(companyId);
  const preview = previewEmployeeCsv(csvText, {
    departments,
    existingEmails: profiles.map((profile) => profile.email),
    existingEmployeeNumbers: profiles
      .map((profile) => profile.employee_number)
      .filter((number): number is string => Boolean(number)),
  });

  if (preview.rows.length > maximumCsvRows) {
    throw new EmployeeProvisioningError("invalid", `CSV imports are limited to ${maximumCsvRows} employee rows.`);
  }

  return { preview, departments };
}

export async function previewCompanyEmployeeImport(csvText: string) {
  const admin = await loadAdminContext();
  const { preview } = await buildCsvPreview(admin.company_id, csvText);
  return preview;
}

export async function importCompanyEmployees(csvText: string) {
  const admin = await loadAdminContext();
  const { preview, departments } = await buildCsvPreview(admin.company_id, csvText);
  const rows = preview.rows.map((row) => ({ ...row, invitationQueued: false }));
  let created = 0;
  let invitationsQueued = 0;

  for (const row of rows) {
    if (row.status !== "ready") continue;

    try {
      const result = await provisionEmployeeForAdmin(admin, {
        ...row.employee,
        departmentId: row.employee.department
          ? departments.find(
              (department) => department.name.toLocaleLowerCase() === row.employee.department?.toLocaleLowerCase()
            )?.id ?? null
          : null,
      });
      row.status = "created";
      row.invitationQueued = result.invitationQueued;
      created += 1;
      if (result.invitationQueued) invitationsQueued += 1;
    } catch (error) {
      row.status = "error";
      row.errors.push(
        error instanceof EmployeeProvisioningError || error instanceof EmployeeAccessError
          ? error.message
          : "Employee could not be created. Please try again."
      );
    }
  }

  return {
    created,
    invitationsQueued,
    skipped: rows.filter((row) => row.status === "skipped").length,
    errors: rows.filter((row) => row.status === "error").length,
    rows,
    emailProviderNote: rows.some((row) => row.status === "created" && !row.invitationQueued)
      ? "The development email provider does not send messages. Configure the approved email provider before inviting real employees."
      : null,
  };
}

export async function createCompanyEmployee(input: ManualEmployeeInput) {
  const admin = await loadAdminContext();
  return provisionEmployeeForAdmin(admin, input);
}

export function isEmployeeCsvText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Buffer.byteLength(value, "utf8") <= maximumCsvBytes;
}
