import "server-only";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import {
  EmployeeProvisioningError,
  isEmployeeCsvText,
  previewCompanyEmployeeImport,
} from "@/services/admin/employee-provisioning.service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const csv = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).csv
    : undefined;
  if (!isEmployeeCsvText(csv)) {
    return Response.json({ error: "Provide a non-empty CSV file no larger than 2 MB." }, { status: 400 });
  }

  try {
    return Response.json(await previewCompanyEmployeeImport(csv));
  } catch (error) {
    if (error instanceof EmployeeAccessError) {
      return Response.json({ error: error.message }, { status: error.reason === "unauthenticated" ? 401 : 403 });
    }
    if (error instanceof EmployeeProvisioningError) {
      return Response.json({ error: error.message }, { status: error.code === "invalid" ? 400 : 500 });
    }
    return Response.json({ error: "CSV could not be validated. Please try again." }, { status: 500 });
  }
}
