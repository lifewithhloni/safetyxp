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

const createServerSupabaseClient = jest.fn() as jest.MockedFunction<() => Promise<{ from: (table: string) => any }>>;
const canTriggerAiGeneration = jest.fn() as jest.MockedFunction<() => boolean>;
const createAiGenerationJob = jest.fn() as jest.MockedFunction<() => Promise<{ jobId: string }>>;
const processAiGenerationJob = jest.fn() as jest.MockedFunction<() => Promise<void>>;

jest.mock("@/lib/security/api-security", () => ({
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedRole,
  reportUnexpectedApiError,
  safeErrorResponse,
  safeForbiddenOrNotFound,
}));

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

jest.mock("@/services/ai/ai-security.service", () => ({
  canTriggerAiGeneration,
}));

jest.mock("@/services/ai/ai-job.service", () => ({
  createAiGenerationJob,
  processAiGenerationJob,
}));

import { POST } from "./route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/api/ai/generate", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      host: "example.com",
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

function makeQuery(data: Record<string, unknown> | null) {
  return {
    select: jest.fn().mockReturnThis() as jest.MockedFunction<() => any>,
    eq: jest.fn().mockReturnThis() as jest.MockedFunction<() => any>,
    maybeSingle: jest.fn(async () => ({ data, error: null })) as jest.MockedFunction<() => Promise<{ data: Record<string, unknown> | null; error: null }>>,
  };
}

describe("AI generation route contract", () => {
  const adminProfile = { id: "admin-1", company_id: "company-a", role: "admin" };

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuthenticatedRole.mockReset();
    createServerSupabaseClient.mockReset();
    canTriggerAiGeneration.mockReset();
    createAiGenerationJob.mockReset();
    processAiGenerationJob.mockReset();
    reportUnexpectedApiError.mockReset();
  });

  it("returns the existing 401 for unauthenticated requests and does not invoke generation", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(401, "Unauthorized."),
    });

    const response = await POST(makeRequest({ policyId: "policy-1", policyDocumentId: "doc-1" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(requireAuthenticatedRole).toHaveBeenCalledWith(["admin", "super_admin"]);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
    expect(createAiGenerationJob).not.toHaveBeenCalled();
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("denies insufficient-role requests before generation starts", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(403, "Forbidden."),
    });

    const response = await POST(makeRequest({ policyId: "policy-1", policyDocumentId: "doc-1" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden." });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
    expect(createAiGenerationJob).not.toHaveBeenCalled();
  });

  it("rejects cross-company policy or document ownership without starting AI generation", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    createServerSupabaseClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "policies") {
          return makeQuery({ id: "policy-1", company_id: "company-b", title: "Other Company Policy" });
        }
        return makeQuery({ id: "doc-1", company_id: "company-b", extracted_text: "A reasonably long paragraph for generation. ".repeat(6), processing_status: "ready" });
      }),
    });
    canTriggerAiGeneration.mockReturnValue(false);

    const response = await POST(makeRequest({ policyId: "policy-1", policyDocumentId: "doc-1" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(createAiGenerationJob).not.toHaveBeenCalled();
    expect(processAiGenerationJob).not.toHaveBeenCalled();
  });

  it("returns the current 4xx contract for missing required fields and insufficient extracted text", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });

    const missingFieldsResponse = await POST(makeRequest({ policyDocumentId: "doc-1" }));
    expect(missingFieldsResponse.status).toBe(400);
    await expect(missingFieldsResponse.json()).resolves.toEqual({ error: "Invalid request payload." });

    createServerSupabaseClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "policies") {
          return makeQuery({ id: "policy-1", company_id: "company-a", title: "Current Policy" });
        }
        return makeQuery({ id: "doc-1", company_id: "company-a", extracted_text: "too short", processing_status: "ready" });
      }),
    });
    canTriggerAiGeneration.mockReturnValue(true);

    const invalidParametersResponse = await POST(makeRequest({ policyId: "policy-1", policyDocumentId: "doc-1" }));
    expect(invalidParametersResponse.status).toBe(409);
    await expect(invalidParametersResponse.json()).resolves.toEqual({ error: "Policy text is not ready for AI generation." });
  });

  it("reaches the generation service for a valid authorized request and preserves the response contract", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    createServerSupabaseClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "policies") {
          return makeQuery({ id: "policy-1", company_id: "company-a", title: "Current Policy" });
        }
        return makeQuery({ id: "doc-1", company_id: "company-a", extracted_text: "A long extracted policy document body that clearly exceeds the ready threshold for AI generation.", processing_status: "ready" });
      }),
    });
    canTriggerAiGeneration.mockReturnValue(true);
    createAiGenerationJob.mockImplementation(async () => ({ jobId: "job-123" }));

    const response = await POST(makeRequest({ policyId: "policy-1", policyDocumentId: "doc-1", campaignId: "campaign-1" }));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, jobId: "job-123", status: "QUEUED" });
    expect(createAiGenerationJob).toHaveBeenCalledWith({
      companyId: "company-a",
      policyId: "policy-1",
      policyDocumentId: "doc-1",
      createdBy: "admin-1",
      sourceText: "A long extracted policy document body that clearly exceeds the ready threshold for AI generation.",
      policyTitle: "Current Policy",
      campaignId: "campaign-1",
    });
    expect(processAiGenerationJob).toHaveBeenCalledTimes(1);
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("reports unexpected generation failures once and does not leak request or policy data to Sentry", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    createServerSupabaseClient.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "policies") {
          return makeQuery({ id: "policy-1", company_id: "company-a", title: "Current Policy" });
        }
        return makeQuery({ id: "doc-1", company_id: "company-a", extracted_text: "A long extracted policy document body that clearly exceeds the ready threshold for AI generation.", processing_status: "ready" });
      }),
    });
    canTriggerAiGeneration.mockReturnValue(true);
    createAiGenerationJob.mockImplementation(async () => {
      throw new Error("AI generation failed.");
    });

    const response = await POST(makeRequest({ policyId: "policy-1", policyDocumentId: "doc-1" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Unable to start AI generation." });
    expect(reportUnexpectedApiError).toHaveBeenCalledTimes(1);
    expect(reportUnexpectedApiError.mock.calls[0][1]).toBe("generate_ai_content");
    expect(JSON.stringify(reportUnexpectedApiError.mock.calls[0][0])).not.toContain("policy-1");
    expect(JSON.stringify(reportUnexpectedApiError.mock.calls[0][0])).not.toContain("company-a");
    expect(JSON.stringify(reportUnexpectedApiError.mock.calls[0][0])).not.toContain("admin-1");
    expect(JSON.stringify(reportUnexpectedApiError.mock.calls[0][0])).not.toContain("sourceText");
    expect(JSON.stringify(reportUnexpectedApiError.mock.calls[0][0])).not.toContain("Current Policy");
  });
});
