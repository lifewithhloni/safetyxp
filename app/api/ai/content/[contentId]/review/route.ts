import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { approveGeneratedContent, publishGeneratedContent, rejectGeneratedContent } from "@/services/ai/ai-review.service";
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
    key: "ai-content-review",
    maxRequests: 30,
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
    const body = await request.json();
    const action = String(body.action || "").toLowerCase();
    const notes = typeof body.notes === "string" ? body.notes : "";

    if (action === "approve") {
      const result = await approveGeneratedContent(contentId, notes);
      return NextResponse.json({ success: true, result });
    }

    if (action === "reject") {
      const result = await rejectGeneratedContent(contentId, notes || "Rejected by reviewer.");
      return NextResponse.json({ success: true, result });
    }

    if (action === "publish") {
      const result = await publishGeneratedContent(contentId);
      return NextResponse.json({ success: true, result });
    }

    return safeErrorResponse(400, "Invalid action.");
  } catch (error) {
    const status = error instanceof Error && error.message === "Forbidden" ? 403 : 400;
    return safeErrorResponse(status, status === 403 ? "Forbidden." : "Review action failed.");
  }
}
