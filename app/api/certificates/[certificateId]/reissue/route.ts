import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reissueCertificate } from "@/services/certificates/certificate.service";
import {
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedRole,
  safeErrorResponse,
} from "@/lib/security/api-security";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const csrfBlocked = enforceSameOriginForMutations(request);
  if (csrfBlocked) {
    return csrfBlocked;
  }

  const rateLimited = enforceRateLimit({
    request,
    key: "certificate-reissue",
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

  const { certificateId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim().length > 0
      ? body.reason.trim()
      : "Reissued by administrator";

    const certificate = await reissueCertificate(certificateId, reason);
    return NextResponse.json({ ok: true, certificate });
  } catch {
    return safeErrorResponse(404, "Not found.");
  }
}
