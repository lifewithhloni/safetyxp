import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const requireAuthenticatedRole = jest.fn() as jest.MockedFunction<
  () => Promise<{ profile: { id: string; company_id: string; role: string } | null; response: Response | null }>
>;
const enforceRateLimit = jest.fn(() => null) as jest.MockedFunction<() => null>;
const enforceSameOriginForMutations = jest.fn(() => null) as jest.MockedFunction<() => null>;
const reportUnexpectedApiError = jest.fn() as jest.MockedFunction<(error: unknown, operation: string) => void>;
const safeErrorResponse = jest.fn((status: number, message: string) =>
  Response.json({ error: message }, { status })
) as jest.MockedFunction<(status: number, message: string) => Response>;
const safeForbiddenOrNotFound = jest.fn(() =>
  Response.json({ error: "Not found." }, { status: 404 })
) as jest.MockedFunction<() => Response>;

const supabaseAdmin = {
  from: jest.fn() as jest.MockedFunction<(table: string) => any>,
  storage: {
    from: jest.fn() as jest.MockedFunction<(bucket: string) => any>,
  },
};
const extractAndPersistDocumentText = jest.fn() as jest.MockedFunction<() => Promise<{ text: string }>>;
const createAiGenerationJob = jest.fn() as jest.MockedFunction<() => Promise<{ jobId: string }>>;

jest.mock("@/lib/security/api-security", () => ({
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedRole,
  reportUnexpectedApiError,
  safeErrorResponse,
  safeForbiddenOrNotFound,
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin,
}));

jest.mock("@/services/ai/document-analysis.service", () => ({
  extractAndPersistDocumentText,
  SUPPORTED_MIME_TYPES: new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
}));

jest.mock("@/services/ai/ai-job.service", () => ({
  createAiGenerationJob,
}));

import { POST } from "./route";

function makeUploadRequest(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  return new NextRequest("https://example.com/api/policies/policy-1/documents/upload", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      host: "example.com",
      "x-forwarded-for": "203.0.113.11",
    },
    body: formData,
  });
}

function makePolicyQuery(data: Record<string, unknown> | null) {
  return {
    select: jest.fn().mockReturnThis() as jest.MockedFunction<() => any>,
    eq: jest.fn().mockReturnThis() as jest.MockedFunction<() => any>,
    maybeSingle: jest.fn(async () => ({ data, error: null })) as jest.MockedFunction<() => Promise<{ data: Record<string, unknown> | null; error: null }>>,
  };
}

describe("policy document upload route contract", () => {
  const adminProfile = { id: "admin-1", company_id: "company-a", role: "admin" };

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuthenticatedRole.mockReset();
    supabaseAdmin.from.mockReset();
    supabaseAdmin.storage.from.mockReset();
    extractAndPersistDocumentText.mockReset();
    createAiGenerationJob.mockReset();
    reportUnexpectedApiError.mockReset();
  });

  it("returns the existing 401 for unauthenticated requests without touching Storage or extraction", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(401, "Unauthorized."),
    });

    const file = new File(["hello"], "policy.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest(file), { params: Promise.resolve({ policyId: "policy-1" }) });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
    expect(extractAndPersistDocumentText).not.toHaveBeenCalled();
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("returns the existing forbidden contract for unauthorized roles", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(403, "Forbidden."),
    });

    const file = new File(["hello"], "policy.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest(file), { params: Promise.resolve({ policyId: "policy-1" }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden." });
    expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
    expect(extractAndPersistDocumentText).not.toHaveBeenCalled();
  });

  it("blocks cross-company upload attempts before Storage or extraction starts", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "policies") {
        return makePolicyQuery(null);
      }
      return { insert: jest.fn() };
    });

    const file = new File(["hello"], "policy.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest(file), { params: Promise.resolve({ policyId: "policy-1" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
    expect(extractAndPersistDocumentText).not.toHaveBeenCalled();
  });

  it("returns current validation responses for invalid MIME, empty, and oversized files", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "policies") {
        return makePolicyQuery({ id: "policy-1", company_id: "company-a", title: "Policy A" });
      }
      return { insert: jest.fn() };
    });

    const unsupported = new File(["hello"], "policy.txt", { type: "text/plain" });
    const unsupportedResponse = await POST(makeUploadRequest(unsupported), { params: Promise.resolve({ policyId: "policy-1" }) });
    expect(unsupportedResponse.status).toBe(415);
    await expect(unsupportedResponse.json()).resolves.toEqual({ error: "Unsupported file type. Only PDF and DOCX are accepted." });

    const emptyFile = new File([""], "empty.pdf", { type: "application/pdf" });
    const emptyResponse = await POST(makeUploadRequest(emptyFile), { params: Promise.resolve({ policyId: "policy-1" }) });
    expect(emptyResponse.status).toBe(400);
    await expect(emptyResponse.json()).resolves.toEqual({ error: "Uploaded file is empty." });

    const oversized = new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" });
    const oversizedResponse = await POST(makeUploadRequest(oversized), { params: Promise.resolve({ policyId: "policy-1" }) });
    expect(oversizedResponse.status).toBe(413);
    await expect(oversizedResponse.json()).resolves.toEqual({ error: "File exceeds the 20 MB limit." });

    expect(supabaseAdmin.storage.from).not.toHaveBeenCalled();
    expect(extractAndPersistDocumentText).not.toHaveBeenCalled();
  });

  it("performs a valid authorized upload, extraction, and generation trigger using the existing contract", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "policies") {
        return makePolicyQuery({ id: "policy-1", company_id: "company-a", title: "Policy A" });
      }
      if (table === "policy_documents") {
        return {
          insert: jest.fn(async () => ({ error: null })) as jest.MockedFunction<() => Promise<{ error: null }>>,
        };
      }
      return { insert: jest.fn() };
    });

    const storageUpload = jest.fn<() => Promise<{ error: null }>>(async () => ({ error: null }));
    supabaseAdmin.storage.from.mockReturnValue({
      upload: storageUpload,
      remove: jest.fn<() => Promise<{ error: null }>>(async () => ({ error: null })),
    });
    extractAndPersistDocumentText.mockImplementation(async () => ({ text: "Extracted policy text with enough content to indicate it is valid." }));
    createAiGenerationJob.mockImplementation(async () => ({ jobId: "job-100" }));

    const file = new File(["pdf-content"], "policy.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest(file), { params: Promise.resolve({ policyId: "policy-1" }) });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      documentId: expect.any(String),
      jobId: "job-100",
      extractionStatus: "ready",
    });
    expect(supabaseAdmin.storage.from).toHaveBeenCalledWith("policy-documents");
    expect(storageUpload).toHaveBeenCalledTimes(1);
    expect(extractAndPersistDocumentText).toHaveBeenCalledTimes(1);
    expect(createAiGenerationJob).toHaveBeenCalledTimes(1);
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("surfaces storage failures with the current safe response and no sensitive storage payload to Sentry", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "policies") {
        return makePolicyQuery({ id: "policy-1", company_id: "company-a", title: "Policy A" });
      }
      return { insert: jest.fn() };
    });
    supabaseAdmin.storage.from.mockReturnValue({
      upload: jest.fn<() => Promise<{ error: { message: string } }>>(async () => ({ error: { message: "storage failed" } })),
      remove: jest.fn(),
    });

    const file = new File(["pdf-content"], "policy.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest(file), { params: Promise.resolve({ policyId: "policy-1" }) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Document upload failed." });
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
    expect(extractAndPersistDocumentText).not.toHaveBeenCalled();
  });

  it("does not duplicate Sentry reporting when extraction fails; the extraction boundary owns that event", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "policies") {
        return makePolicyQuery({ id: "policy-1", company_id: "company-a", title: "Policy A" });
      }
      if (table === "policy_documents") {
        return {
          insert: jest.fn(async () => ({ error: null })) as jest.MockedFunction<() => Promise<{ error: null }>>,
        };
      }
      return { insert: jest.fn() };
    });
    supabaseAdmin.storage.from.mockReturnValue({
      upload: jest.fn<() => Promise<{ error: null }>>(async () => ({ error: null })),
      remove: jest.fn<() => Promise<{ error: null }>>(async () => ({ error: null })),
    });
    extractAndPersistDocumentText.mockImplementation(async () => {
      throw new Error("Extraction failed.");
    });
    createAiGenerationJob.mockImplementation(async () => ({ jobId: "job-789" }));

    const file = new File(["pdf-content"], "policy.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest(file), { params: Promise.resolve({ policyId: "policy-1" }) });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      documentId: expect.any(String),
      jobId: "job-789",
      extractionStatus: "failed",
    });
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
    expect(createAiGenerationJob).toHaveBeenCalledTimes(1);
  });

  it("keeps Sentry payloads free of file metadata, storage paths, body text, and identity values", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    supabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "policies") {
        return makePolicyQuery({ id: "policy-1", company_id: "company-a", title: "Policy A" });
      }
      if (table === "policy_documents") {
        return {
          insert: jest.fn(async () => ({ error: null })) as jest.MockedFunction<() => Promise<{ error: null }>>,
        };
      }
      return { insert: jest.fn() };
    });
    supabaseAdmin.storage.from.mockReturnValue({
      upload: jest.fn<() => Promise<{ error: null }>>(async () => ({ error: null })),
      remove: jest.fn<() => Promise<{ error: null }>>(async () => ({ error: null })),
    });
    extractAndPersistDocumentText.mockImplementation(async () => ({ text: "This is extracted text" }));
    createAiGenerationJob.mockImplementation(async () => {
      throw new Error("Job creation failed.");
    });

    const file = new File(["pdf-content"], "super-sensitive-policy.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest(file), { params: Promise.resolve({ policyId: "policy-1" }) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Document upload failed." });
    expect(reportUnexpectedApiError).toHaveBeenCalledTimes(1);
    const [error, operation] = reportUnexpectedApiError.mock.calls[0];
    expect(operation).toBe("upload_policy_document");
    expect(JSON.stringify(error)).not.toContain("super-sensitive-policy.pdf");
    expect(JSON.stringify(error)).not.toContain("company-a");
    expect(JSON.stringify(error)).not.toContain("admin-1");
    expect(JSON.stringify(error)).not.toContain("policy-1");
    expect(JSON.stringify(error)).not.toContain("pdf-content");
    expect(JSON.stringify(error)).not.toContain("This is extracted text");
    expect(JSON.stringify(error)).not.toContain("file");
  });
});
