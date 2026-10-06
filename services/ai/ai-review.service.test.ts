import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const getCurrentProfile: any = jest.fn();
const createServerSupabaseClient: any = jest.fn();
const supabaseAdminFrom: any = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
  getCurrentProfile,
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: supabaseAdminFrom,
  },
}));

import {
  approveGeneratedContent,
  publishGeneratedContent,
  rejectGeneratedContent,
} from "./ai-review.service";

function buildContent(overrides: Record<string, unknown> = {}) {
  return {
    id: "content-123",
    company_id: "company-a",
    policy_id: "policy-1",
    campaign_id: "campaign-1",
    content_type: "policy",
    content: { version: 1 },
    status: "UNDER_REVIEW",
    source_document_id: "doc-1",
    created_by: "employee-1",
    ...overrides,
  };
}

function buildGeneratedContentClient(contentRecord: Record<string, unknown>, updateResult: Record<string, unknown>) {
  const maybeSingle = jest.fn(async () => ({ data: contentRecord, error: null }));

  const update = jest.fn(() => ({
    eq: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(async () => ({ data: updateResult, error: null })),
      })),
    })),
  }));

  const generatedContentClient = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle,
    update,
  };

  const client = {
    from: jest.fn((table: string) => {
      if (table === "generated_content") {
        return generatedContentClient;
      }

      return {
        insert: jest.fn(async () => ({ data: null, error: null })),
      };
    }),
  } as const;

  return { client, generatedContentClient, maybeSingle };
}

describe("ai review authorization and publication behavior", () => {
  const contentReviewsInsert = jest.fn(async () => ({ data: null, error: null }));

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentProfile.mockReset();
    createServerSupabaseClient.mockReset();
    supabaseAdminFrom.mockReset();
    supabaseAdminFrom.mockImplementation((table: string) => ({
      insert: table === "content_reviews" ? contentReviewsInsert : jest.fn(async () => ({ data: null, error: null })),
    }));
  });

  it("allows a same-company admin to approve eligible AI-generated content and records review state", async () => {
    const profile = { id: "admin-1", company_id: "company-a", role: "admin" };
    getCurrentProfile.mockResolvedValue(profile);

    const content = buildContent({ id: "content-approved", status: "UNDER_REVIEW" });
    const { client, generatedContentClient } = buildGeneratedContentClient(content, { id: content.id, status: "APPROVED" });
    createServerSupabaseClient.mockImplementation(async () => client);

    await expect(approveGeneratedContent(content.id, "Looks good")).resolves.toEqual({ id: content.id, status: "APPROVED" });

    expect(generatedContentClient.update).toHaveBeenCalledTimes(1);
    expect(generatedContentClient.update).toHaveBeenCalledWith({ status: "APPROVED", updated_at: expect.any(String) });
    const updatePayload = ((generatedContentClient.update as any).mock.calls[0] ?? [])[0] as Record<string, unknown>;
    expect(Object.keys(updatePayload).sort()).toEqual(["status", "updated_at"]);
    expect(contentReviewsInsert).toHaveBeenCalledTimes(1);

    const payload = ((contentReviewsInsert as any).mock.calls[0] ?? [])[0] as Record<string, unknown>;
    expect(payload).toEqual({
      generated_content_id: content.id,
      reviewer_id: profile.id,
      status: "approved",
      notes: "Looks good",
      reviewed_at: expect.any(String),
    });
    expect(Object.keys(payload).sort()).toEqual(["generated_content_id", "notes", "reviewed_at", "reviewer_id", "status"].sort());
    expect(JSON.stringify(payload)).not.toContain("company-a");
    expect(JSON.stringify(payload)).not.toContain("sourceText");
  });

  it("allows a same-company admin to reject eligible AI-generated content and persists the rejection state", async () => {
    const profile = { id: "admin-1", company_id: "company-a", role: "admin" };
    getCurrentProfile.mockResolvedValue(profile);

    const content = buildContent({ id: "content-rejected", status: "UNDER_REVIEW" });
    const { client, generatedContentClient } = buildGeneratedContentClient(content, { id: content.id, status: "REJECTED" });
    createServerSupabaseClient.mockImplementation(async () => client);

    await expect(rejectGeneratedContent(content.id, "Needs rewrite")).resolves.toEqual({ id: content.id, status: "REJECTED" });

    expect(generatedContentClient.update).toHaveBeenCalledTimes(1);
    expect(generatedContentClient.update).toHaveBeenCalledWith({ status: "REJECTED", updated_at: expect.any(String) });
    expect(contentReviewsInsert).toHaveBeenCalledTimes(1);
    expect(contentReviewsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        generated_content_id: content.id,
        reviewer_id: profile.id,
        status: "rejected",
        notes: "Needs rewrite",
        reviewed_at: expect.any(String),
      })
    );
    const payload = ((contentReviewsInsert as any).mock.calls[0] ?? [])[0] as Record<string, unknown>;
    const keys = Object.keys(payload as Record<string, unknown>);
    expect(keys.sort()).toEqual(["generated_content_id", "notes", "reviewed_at", "reviewer_id", "status"].sort());
  });

  it("rejects employee approval, rejection, and publication attempts exactly as the current contract requires", async () => {
    const profile = { id: "employee-1", company_id: "company-a", role: "employee" };
    getCurrentProfile.mockResolvedValue(profile);

    await expect(approveGeneratedContent("content-1")).rejects.toThrow("Forbidden");
    await expect(rejectGeneratedContent("content-1", "Nope")).rejects.toThrow("Forbidden");
    await expect(publishGeneratedContent("content-1")).rejects.toThrow("Forbidden");

    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("enforces cross-company ownership checks when an admin from Company A tries to act on Company B content", async () => {
    const profile = { id: "admin-1", company_id: "company-a", role: "admin" };
    getCurrentProfile.mockResolvedValue(profile);

    const contentSelector = {
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    };

    const client = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue(contentSelector),
      }),
    };

    createServerSupabaseClient.mockImplementation(async () => client);

    await expect(approveGeneratedContent("content-b-company", "Nope")).rejects.toThrow("Generated content not found.");
    await expect(rejectGeneratedContent("content-b-company", "Nope")).rejects.toThrow("Generated content not found.");
    await expect(publishGeneratedContent("content-b-company")).rejects.toThrow("Generated content not found.");

    const eqCalls = contentSelector.eq.mock.calls.map(([field, value]) => [field, value]);
    expect(eqCalls).toContainEqual(["id", "content-b-company"]);
    expect(eqCalls).toContainEqual(["company_id", "company-a"]);
  });

  it("blocks publication when content is rejected or still under review", async () => {
    const profile = { id: "admin-1", company_id: "company-a", role: "admin" };
    getCurrentProfile.mockResolvedValue(profile);

    const rejectedContent = buildContent({ id: "content-rejected", status: "REJECTED" });
    const underReviewContent = buildContent({ id: "content-pending", status: "UNDER_REVIEW" });

    const rejectedClient = buildGeneratedContentClient(rejectedContent, { id: rejectedContent.id, status: "PUBLISHED" });
    const pendingClient = buildGeneratedContentClient(underReviewContent, { id: underReviewContent.id, status: "PUBLISHED" });

    (createServerSupabaseClient as any).mockImplementationOnce(async () => rejectedClient.client);
    await expect(publishGeneratedContent(rejectedContent.id)).rejects.toThrow("Only approved content can be published.");

    (createServerSupabaseClient as any).mockImplementationOnce(async () => pendingClient.client);
    await expect(publishGeneratedContent(underReviewContent.id)).rejects.toThrow("Only approved content can be published.");
  });

  it("publishes only approved content through the existing approved-content path", async () => {
    const profile = { id: "admin-1", company_id: "company-a", role: "admin" };
    getCurrentProfile.mockResolvedValue(profile);

    const approvedContent = buildContent({ id: "content-approved", status: "APPROVED" });
    const approvedClient = buildGeneratedContentClient(approvedContent, { id: approvedContent.id, status: "PUBLISHED" });

    createServerSupabaseClient.mockImplementation(async () => approvedClient.client);
    await expect(publishGeneratedContent(approvedContent.id)).resolves.toEqual({ id: approvedContent.id, status: "PUBLISHED" });

    expect(approvedClient.generatedContentClient.update).toHaveBeenCalledWith({ status: "PUBLISHED", updated_at: expect.any(String) });
    expect(contentReviewsInsert).not.toHaveBeenCalled();
  });

  it("keeps current repeated-review and publication behavior explicit and unchanged", async () => {
    const profile = { id: "admin-1", company_id: "company-a", role: "admin" };
    getCurrentProfile.mockResolvedValue(profile);

    const alreadyApproved = buildContent({ id: "already-approved", status: "APPROVED" });
    const alreadyRejected = buildContent({ id: "already-rejected", status: "REJECTED" });
    const alreadyPublished = buildContent({ id: "already-published", status: "PUBLISHED" });

    const approvedClient = buildGeneratedContentClient(alreadyApproved, { id: alreadyApproved.id, status: "APPROVED" });
    const rejectedClient = buildGeneratedContentClient(alreadyRejected, { id: alreadyRejected.id, status: "REJECTED" });
    const publishedClient = buildGeneratedContentClient(alreadyPublished, { id: alreadyPublished.id, status: "PUBLISHED" });

    createServerSupabaseClient.mockImplementation(async () => approvedClient.client);
    await expect(approveGeneratedContent(alreadyApproved.id, "Again")).resolves.toEqual({ id: alreadyApproved.id, status: "APPROVED" });

    createServerSupabaseClient.mockImplementation(async () => rejectedClient.client);
    await expect(rejectGeneratedContent(alreadyRejected.id, "Again")).resolves.toEqual({ id: alreadyRejected.id, status: "REJECTED" });

    createServerSupabaseClient.mockImplementation(async () => publishedClient.client);
    await expect(publishGeneratedContent(alreadyPublished.id)).rejects.toThrow("Only approved content can be published.");

    expect(contentReviewsInsert).toHaveBeenCalledTimes(2);
  });

  it("records only the required audit identifiers and state for review actions, without leaking content payload details", async () => {
    const profile = { id: "admin-1", company_id: "company-a", role: "admin" };
    getCurrentProfile.mockResolvedValue(profile);

    const content = buildContent({
      id: "content-audit",
      status: "UNDER_REVIEW",
      content: { version: 2, sourceText: "secret source text", stuff: "do not leak" },
    });
    const { client, generatedContentClient } = buildGeneratedContentClient(content, { id: content.id, status: "APPROVED" });
    createServerSupabaseClient.mockImplementation(async () => client);

    await approveGeneratedContent(content.id, "Audit clean");

    const payload = ((contentReviewsInsert as any).mock.calls[0] ?? [])[0] as Record<string, unknown>;
    const keys = Object.keys(payload as Record<string, unknown>);
    expect(keys).toEqual(["generated_content_id", "reviewer_id", "status", "notes", "reviewed_at"]);
    expect(payload.generated_content_id).toBe(content.id);
    expect(payload.reviewer_id).toBe(profile.id);
    expect(payload.status).toBe("approved");
    expect(payload.notes).toBe("Audit clean");
    expect(JSON.stringify(payload)).not.toContain("sourceText");
    expect(JSON.stringify(payload)).not.toContain("company-a");
    expect(JSON.stringify(payload)).not.toContain("secret source text");
    expect(generatedContentClient.update).toHaveBeenCalledWith({ status: "APPROVED", updated_at: expect.any(String) });
  });
});
