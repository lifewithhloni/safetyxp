import "server-only";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import {
  assignEmployeesToCampaign,
  CampaignManagementError,
  getCampaignAssignmentData,
} from "@/services/admin/campaign-management.service";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

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
  return Response.json({ error: "Campaign assignments could not be completed. Please try again." }, { status: 500 });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    return Response.json(await getCampaignAssignmentData(campaignId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    !isObject(body) ||
    !Array.isArray(body.employeeIds) ||
    body.employeeIds.some((employeeId) => typeof employeeId !== "string")
  ) {
    return Response.json({ error: "Select at least one valid employee to assign." }, { status: 400 });
  }

  try {
    const { campaignId } = await context.params;
    const result = await assignEmployeesToCampaign(campaignId, {
      employeeIds: body.employeeIds,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
