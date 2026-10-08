import "server-only";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import {
  CampaignManagementError,
  createLearningModules,
  type CreateLearningModuleInput,
} from "@/services/admin/campaign-management.service";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseModule(value: unknown): CreateLearningModuleInput | null {
  if (!isObject(value)) {
    return null;
  }
  if (
    typeof value.title !== "string" ||
    !value.title.trim() ||
    (value.description !== undefined && value.description !== null && typeof value.description !== "string") ||
    (value.content !== undefined && value.content !== null && typeof value.content !== "string") ||
    (value.estimatedMinutes !== undefined &&
      value.estimatedMinutes !== null &&
      (typeof value.estimatedMinutes !== "number" || !Number.isSafeInteger(value.estimatedMinutes) || value.estimatedMinutes < 0)) ||
    (value.orderIndex !== undefined &&
      (typeof value.orderIndex !== "number" || !Number.isSafeInteger(value.orderIndex) || value.orderIndex < 0))
  ) {
    return null;
  }

  return {
    title: value.title,
    ...(typeof value.description === "string" || value.description === null
      ? { description: value.description }
      : {}),
    ...(typeof value.content === "string" || value.content === null
      ? { content: value.content }
      : {}),
    ...(typeof value.estimatedMinutes === "number" || value.estimatedMinutes === null
      ? { estimatedMinutes: value.estimatedMinutes }
      : {}),
    ...(typeof value.orderIndex === "number" ? { orderIndex: value.orderIndex } : {}),
  };
}

function parseModules(value: unknown): CreateLearningModuleInput[] | null {
  if (!isObject(value) || !Array.isArray(value.modules) || value.modules.length === 0) {
    return null;
  }
  const modules: CreateLearningModuleInput[] = [];
  for (const item of value.modules) {
    const parsedModule = parseModule(item);
    if (!parsedModule) {
      return null;
    }
    modules.push(parsedModule);
  }
  return modules;
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
  return Response.json({ error: "Learning modules could not be saved." }, { status: 500 });
}

export async function POST(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const modules = parseModules(body);
  if (!modules) {
    return Response.json({ error: "Provide valid learning module details." }, { status: 400 });
  }

  try {
    const { campaignId } = await params;
    const createdModules = await createLearningModules(campaignId, modules);
    return Response.json({ modules: createdModules }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
