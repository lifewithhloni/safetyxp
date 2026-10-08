import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type {
  CreateLearningModuleInput,
  LearningModuleRecord,
} from "@/services/admin/campaign-management.service";

const createLearningModulesMock = jest.fn<
  (campaignId: string, modules: CreateLearningModuleInput[]) => Promise<LearningModuleRecord[]>
>();

jest.mock("@/services/admin/campaign-management.service", () => {
  class CampaignManagementError extends Error {
    constructor(
      readonly code: "invalid" | "not_found" | "database",
      message: string
    ) {
      super(message);
    }
  }
  return {
    CampaignManagementError,
    createLearningModules: createLearningModulesMock,
  };
});

jest.mock("@/services/admin/employee-management.service", () => ({
  EmployeeAccessError: class EmployeeAccessError extends Error {
    constructor(readonly reason: "unauthenticated" | "forbidden") {
      super(reason);
    }
  },
}));

import { CampaignManagementError } from "@/services/admin/campaign-management.service";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import { POST } from "./route";

const context = { params: Promise.resolve({ campaignId: "campaign-real-id" }) };

describe("POST campaign learning modules route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists only accepted module fields and returns the real saved record", async () => {
    const saved = {
      id: "module-persisted-id",
      campaign_id: "campaign-real-id",
      title: "First aid",
      description: null,
      content: null,
      estimated_minutes: null,
      order_index: 0,
      status: "draft" as const,
      created_at: "2026-10-08T00:00:00.000Z",
    };
    createLearningModulesMock.mockResolvedValue([saved]);
    const request = new Request("http://localhost/api/admin/campaigns/campaign-real-id/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modules: [{
          title: "First aid",
          company_id: "attacker-company",
          campaign_id: "attacker-campaign",
          status: "published",
          created_by: "attacker",
        }],
      }),
    });

    const response = await POST(request, context);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ modules: [saved] });
    expect(createLearningModulesMock).toHaveBeenCalledWith("campaign-real-id", [{ title: "First aid" }]);
  });

  it("rejects malformed JSON and invalid module payloads", async () => {
    const malformedRequest = new Request("http://localhost/api/admin/campaigns/id/modules", {
      method: "POST",
      body: "{",
    });
    const malformedResponse = await POST(malformedRequest, context);
    expect(malformedResponse.status).toBe(400);
    await expect(malformedResponse.json()).resolves.toEqual({ error: "Request body must be valid JSON." });

    const invalidRequest = new Request("http://localhost/api/admin/campaigns/id/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: [{ title: "" }] }),
    });
    const invalidResponse = await POST(invalidRequest, context);
    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toEqual({ error: "Provide valid learning module details." });
    expect(createLearningModulesMock).not.toHaveBeenCalled();
  });

  it("maps authentication and company-scoped missing campaigns to safe responses", async () => {
    createLearningModulesMock.mockRejectedValueOnce(new EmployeeAccessError("unauthenticated"));
    const request = () => new Request("http://localhost/api/admin/campaigns/id/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: [{ title: "First aid" }] }),
    });
    expect((await POST(request(), context)).status).toBe(401);

    createLearningModulesMock.mockRejectedValueOnce(new CampaignManagementError("not_found", "Campaign not found."));
    const response = await POST(request(), context);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Campaign not found." });
  });

  it("hides unexpected database errors", async () => {
    createLearningModulesMock.mockRejectedValue(new Error("sensitive database details"));
    const response = await POST(new Request("http://localhost/api/admin/campaigns/id/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: [{ title: "First aid" }] }),
    }), context);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Learning modules could not be saved." });
  });
});
