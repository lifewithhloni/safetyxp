import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedRole,
  reportUnexpectedApiError,
  safeErrorResponse,
  safeForbiddenOrNotFound,
} from "@/lib/security/api-security";
import { extractAndPersistDocumentText, SUPPORTED_MIME_TYPES } from "@/services/ai/document-analysis.service";
import { createAiGenerationJob } from "@/services/ai/ai-job.service";
import { randomUUID } from "node:crypto";

// 20 MB matches the bucket-level limit configured in Supabase Storage.
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  const csrfBlocked = enforceSameOriginForMutations(request);
  if (csrfBlocked) return csrfBlocked;

  const rateLimited = enforceRateLimit({
    request,
    key: "policy-upload",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  try {
    const auth = await requireAuthenticatedRole(["admin", "super_admin"]);
    if (auth.response) return auth.response;
    if (!auth.profile) return safeErrorResponse(401, "Unauthorized.");

    const { policyId } = await params;
    if (!policyId) return safeErrorResponse(400, "Missing policy ID.");

    // Verify policy belongs to the authenticated admin's company.
    const { data: policy, error: policyError } = await supabaseAdmin
      .from("policies")
      .select("id, company_id, title")
      .eq("id", policyId)
      .eq("company_id", auth.profile.company_id)
      .maybeSingle();

    if (policyError || !policy) return safeForbiddenOrNotFound();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return safeErrorResponse(400, "No file uploaded.");

    if (!SUPPORTED_MIME_TYPES.has(file.type)) {
      return safeErrorResponse(415, "Unsupported file type. Only PDF and DOCX are accepted.");
    }

    if (file.size > MAX_FILE_BYTES) {
      return safeErrorResponse(413, "File exceeds the 20 MB limit.");
    }

    if (file.size === 0) {
      return safeErrorResponse(400, "Uploaded file is empty.");
    }

    const safeFilename = sanitizeFilename(file.name);
    const storagePath = `${auth.profile.company_id}/${policyId}/${safeFilename}`;

    // Upload to Storage before creating the DB record.
    const fileBuffer = await file.arrayBuffer();
    const { error: storageError } = await supabaseAdmin.storage
      .from("policy-documents")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      return safeErrorResponse(500, "Document upload failed.");
    }

    const documentId = randomUUID();
    const { error: insertError } = await supabaseAdmin.from("policy_documents").insert({
      id: documentId,
      policy_id: policyId,
      company_id: auth.profile.company_id,
      file_name: file.name,
      storage_path: storagePath,
      file_type: file.type,
      file_size: file.size,
      processing_status: "queued",
    });

    if (insertError) {
      // Best-effort storage cleanup to avoid orphaned objects.
      await supabaseAdmin.storage.from("policy-documents").remove([storagePath]);
      return safeErrorResponse(500, "Failed to create document record.");
    }

    // Trigger extraction inline — files are small enough to process synchronously.
    let extractionSucceeded = false;
    try {
      await extractAndPersistDocumentText({
        policyDocumentId: documentId,
        storagePath,
        fileType: file.type,
      });
      extractionSucceeded = true;
    } catch {
      // processing_status is set to 'failed' inside extractAndPersistDocumentText.
      // The document record is preserved; the admin can retry via AI generate.
    }

    const { jobId } = await createAiGenerationJob({
      companyId: auth.profile.company_id,
      policyId,
      policyDocumentId: documentId,
      createdBy: auth.profile.id,
      sourceText: extractionSucceeded ? "" : "",
      policyTitle: policy.title,
    });

    return NextResponse.json(
      {
        success: true,
        documentId,
        jobId,
        extractionStatus: extractionSucceeded ? "ready" : "failed",
      },
      { status: 201 }
    );
  } catch (error) {
    reportUnexpectedApiError(error, "upload_policy_document");
    return safeErrorResponse(500, "Document upload failed.");
  }
}
