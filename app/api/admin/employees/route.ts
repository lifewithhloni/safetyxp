import "server-only";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import {
  createCompanyEmployee,
  EmployeeProvisioningError,
} from "@/services/admin/employee-provisioning.service";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isManualEmployee(value: unknown): value is {
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber?: string | null;
  jobTitle?: string | null;
  departmentId?: string | null;
  newDepartmentName?: string | null;
} {
  if (!isObject(value)) return false;
  const requiredText = ["firstName", "lastName", "email"];
  const optionalText = ["employeeNumber", "jobTitle", "departmentId", "newDepartmentName"];

  return requiredText.every((field) => typeof value[field] === "string") &&
    optionalText.every((field) => value[field] === undefined || value[field] === null || typeof value[field] === "string") &&
    (value.departmentId !== "__create_new_department__" || typeof value.newDepartmentName === "string");
}

function errorResponse(error: unknown) {
  if (error instanceof EmployeeAccessError) {
    const status = error.reason === "unauthenticated" ? 401 : 403;
    return Response.json({ error: error.message }, { status });
  }
  if (error instanceof EmployeeProvisioningError) {
    const status = error.code === "invalid" ? 400
      : error.code === "duplicate" || error.code === "auth-conflict" ? 409
        : error.code === "department" ? 400
          : 500;
    return Response.json({ error: error.message }, { status });
  }
  return Response.json({ error: "Employee could not be created. Please try again." }, { status: 500 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isManualEmployee(body)) {
    return Response.json({ error: "Employee details are incomplete or invalid." }, { status: 400 });
  }

  try {
    const result = await createCompanyEmployee({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      employeeNumber: typeof body.employeeNumber === "string" ? body.employeeNumber : null,
      jobTitle: typeof body.jobTitle === "string" ? body.jobTitle : null,
      department: null,
      departmentId: typeof body.departmentId === "string" && body.departmentId !== "__create_new_department__"
        ? body.departmentId
        : null,
      ...(typeof body.newDepartmentName === "string" || body.newDepartmentName === null
        ? { newDepartmentName: body.newDepartmentName }
        : {}),
    });
    return Response.json({
      employeeId: result.employeeId,
      invitationQueued: result.invitationQueued,
      emailProvider: result.emailProvider,
      emailProviderNote: result.invitationQueued
        ? null
        : "The development email provider does not send messages. Configure the approved email provider before inviting real employees.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
