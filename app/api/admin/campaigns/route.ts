import "server-only";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import {
  CampaignManagementError,
  createCompanyCampaign,
  getCompanyCampaigns,
  type CreateCampaignInput,
} from "@/services/admin/campaign-management.service";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCreateCampaignInput(value: unknown): CreateCampaignInput | null {
  if (!isObject(value)) {
    return null;
  }
  if (
    typeof value.name !== "string" ||
    typeof value.officialDeadline !== "string" ||
    (value.description !== undefined && typeof value.description !== "string") ||
    (value.bufferDays !== undefined && typeof value.bufferDays !== "number")
  ) {
    return null;
  }

  return {
    name: value.name,
    officialDeadline: value.officialDeadline,
    ...(typeof value.description === "string" ? { description: value.description } : {}),
    ...(typeof value.bufferDays === "number" ? { bufferDays: value.bufferDays } : {}),
  };
}

function errorResponse(error: unknown) {
  if (error instanceof EmployeeAccessError) {
    return Response.json(
      { error: error.message },
      { status: error.reason === "unauthenticated" ? 401 : 403 }
    );
  }
  if (error instanceof CampaignManagementError) {
    const status = error.code === "invalid" ? 400 : error.code === "not_found" ? 404 : 500;
    return Response.json({ error: error.message }, { status });
  }
  return Response.json({ error: "Campaign request could not be completed." }, { status: 500 });
}

export async function GET() {
  try {
    return Response.json(await getCompanyCampaigns());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = parseCreateCampaignInput(body);
  if (!input) {
    return Response.json({ error: "Campaign details are incomplete or invalid." }, { status: 400 });
  }

  try {
    return Response.json(await createCompanyCampaign(input), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
