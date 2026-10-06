export type EmployeeInvitationStatus = "Invited" | "Active" | "Expired" | "Not Invited" | "Suspended";

export type EmployeeRecordDraft = {
  id?: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  departmentId?: string | null;
  departmentName?: string | null;
  jobTitle?: string | null;
  managerEmail?: string | null;
  location?: string | null;
  employmentStatus?: "active" | "inactive" | "suspended" | "terminated";
  role?: "employee";
  invitedBy?: string | null;
  status?: EmployeeInvitationStatus;
};

export function validateEmployee(input: EmployeeRecordDraft) {
  const errors: string[] = [];

  if (!input.firstName?.trim()) errors.push("First name is required.");
  if (!input.lastName?.trim()) errors.push("Last name is required.");
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.push("Valid email is required.");
  if (!input.employeeNumber?.trim()) errors.push("Employee number is required.");
  if (!input.companyId) errors.push("Company membership is required.");

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function createEmployee(input: EmployeeRecordDraft) {
  const validation = validateEmployee(input);

  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  return {
    id: input.id ?? `employee-${Date.now()}`,
    companyId: input.companyId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    employeeNumber: input.employeeNumber,
    departmentId: input.departmentId ?? null,
    departmentName: input.departmentName ?? null,
    jobTitle: input.jobTitle ?? null,
    managerEmail: input.managerEmail ?? null,
    location: input.location ?? null,
    employmentStatus: input.employmentStatus ?? "active",
    role: input.role ?? "employee",
    invitedBy: input.invitedBy ?? null,
    status: input.status ?? "Not Invited",
  };
}
