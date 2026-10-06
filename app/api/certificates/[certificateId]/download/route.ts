import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCertificateDownloadUrl } from "@/services/certificates/certificate.service";
import {
  enforceRateLimit,
  requireAuthenticatedRole,
  safeForbiddenOrNotFound,
} from "@/lib/security/api-security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  const rateLimited = enforceRateLimit({
    request,
    key: "certificate-download",
    maxRequests: 30,
    windowMs: 60_000,
  });

  if (rateLimited) {
    return rateLimited;
  }

  const auth = await requireAuthenticatedRole(["employee", "admin", "super_admin"]);
  if (auth.response) {
    return auth.response;
  }

  const { certificateId } = await params;

  try {
    const url = await getCertificateDownloadUrl(certificateId);
    return NextResponse.redirect(url, { status: 302 });
  } catch {
    return safeForbiddenOrNotFound();
  }
}
