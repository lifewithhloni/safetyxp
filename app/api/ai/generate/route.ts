import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canTriggerAiGeneration } from "@/services/ai/ai-security.service";
import { createAiGenerationJob, processAiGenerationJob } from "@/services/ai/ai-job.service";
import {
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedRole,
  reportUnexpectedApiError,
  safeErrorResponse,
  safeForbiddenOrNotFound,
} from "@/lib/security/api-security";

export async function POST(request: NextRequest) {
  const csrfBlocked = enforceSameOriginForMutations(request);
  if (csrfBlocked) {
    return csrfBlocked;
  }

  const rateLimited = enforceRateLimit({
    request,
    key: "ai-generate",
    maxRequests: 10,
    windowMs: 60_000,
  });

  if (rateLimited) {
    return rateLimited;
  }

  try {
    const auth = await requireAuthenticatedRole(["admin", "super_admin"]);
    if (auth.response) {
      return auth.response;
    }

    if (!auth.profile) {
      return safeErrorResponse(401, "Unauthorized.");
    }

    const profile = auth.profile;

    const body = await request.json();
    const policyId = String(body.policyId || "");
    const policyDocumentId = String(body.policyDocumentId || "");
    const campaignId = body.campaignId ? String(body.campaignId) : undefined;

    if (!policyId || !policyDocumentId) {
      return safeErrorResponse(400, "Invalid request payload.");
    }

    const supabase = await createServerSupabaseClient();
    const { data: policy, error: policyError } = await supabase
      .from("policies")
      .select("id, company_id, title")
      .eq("id", policyId)
      .maybeSingle();

    if (policyError || !policy) {
      return safeForbiddenOrNotFound();
    }

    const { data: document, error: docError } = await supabase
      .from("policy_documents")
      .select("id, company_id, extracted_text, processing_status")
      .eq("id", policyDocumentId)
      .eq("policy_id", policyId)
      .maybeSingle();

    if (docError || !document) {
      return safeForbiddenOrNotFound();
    }

    if (!canTriggerAiGeneration({
      requesterRole: profile.role,
      requesterCompanyId: profile.company_id,
      policyCompanyId: policy.company_id,
      policyDocumentCompanyId: document.company_id,
    })) {
      return safeForbiddenOrNotFound();
    }

    if (!document.extracted_text || document.extracted_text.trim().length < 50) {
      return safeErrorResponse(409, "Policy text is not ready for AI generation.");
    }

    const { jobId } = await createAiGenerationJob({
      companyId: profile.company_id,
      policyId,
      policyDocumentId,
      createdBy: profile.id,
      sourceText: document.extracted_text,
      policyTitle: policy.title,
      campaignId,
    });

    void processAiGenerationJob({
      jobId,
      companyId: profile.company_id,
      policyId,
      policyDocumentId,
      createdBy: profile.id,
      sourceText: document.extracted_text,
      policyTitle: policy.title,
      campaignId,
    });

    return NextResponse.json({ success: true, jobId, status: "QUEUED" }, { status: 202 });
  } catch (error) {
    reportUnexpectedApiError(error, "generate_ai_content");
    return safeErrorResponse(500, "Unable to start AI generation.");
  }
}
