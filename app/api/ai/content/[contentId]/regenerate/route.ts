import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { regenerateGeneratedContent } from "@/services/ai/ai-review.service";
import {
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedRole,
  safeErrorResponse,
} from "@/lib/security/api-security";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  const csrfBlocked = enforceSameOriginForMutations(request);
  if (csrfBlocked) {
    return csrfBlocked;
  }

  const rateLimited = enforceRateLimit({
    request,
    key: "ai-content-regenerate",
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireAuthenticatedRole(["admin", "super_admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { contentId } = await params;

  try {
    const result = await regenerateGeneratedContent(contentId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const status = error instanceof Error && error.message === "Forbidden" ? 403 : 400;
    return safeErrorResponse(status, status === 403 ? "Forbidden." : "Regeneration failed.");
  }
}
