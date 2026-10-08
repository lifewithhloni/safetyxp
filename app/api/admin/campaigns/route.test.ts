import { describe, expect, it, jest } from "@jest/globals";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import { CampaignManagementError } from "@/services/admin/campaign-management.service";

const mockCreateCompanyCampaign = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetCompanyCampaigns = jest.fn<() => Promise<unknown>>();

jest.mock("@/services/admin/campaign-management.service", () => ({
  CampaignManagementError: class CampaignManagementError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
      this.name = "CampaignManagementError";
    }
  },
  createCompanyCampaign: (...args: unknown[]) => mockCreateCompanyCampaign(...args),
  getCompanyCampaigns: () => mockGetCompanyCampaigns(),
}));

jest.mock("@/services/admin/employee-management.service", () => ({
  EmployeeAccessError: class EmployeeAccessError extends Error {
    constructor(readonly reason: "unauthenticated" | "forbidden") {
      super(reason === "unauthenticated" ? "Authentication required." : "Company admin access required.");
      this.name = "EmployeeAccessError";
    }
  },
}));

import { GET, POST } from "./route";

describe("/api/admin/campaigns", () => {
  it("creates a draft campaign and ignores client tenancy and status fields", async () => {
    const campaign = { id: "campaign-1", company_id: "company-authenticated", status: "draft" };
    mockCreateCompanyCampaign.mockResolvedValue(campaign);

    const response = await POST(new Request("https://safetyxp.example/api/admin/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: "company-attacker",
        createdBy: "attacker",
        status: "published",
        publishedAt: "now",
        name: " Safety Induction ",
        officialDeadline: "2026-12-31",
      }),
    }));

    expect(response.status).toBe(201);
    expect(mockCreateCompanyCampaign).toHaveBeenCalledWith({
      name: " Safety Induction ",
      officialDeadline: "2026-12-31",
    });
    await expect(response.json()).resolves.toEqual(campaign);
  });

  it("returns a safe unauthorized response", async () => {
    mockGetCompanyCampaigns.mockRejectedValue(new EmployeeAccessError("unauthenticated"));

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
  });

  it("returns a safe forbidden response for non-admin users", async () => {
    mockGetCompanyCampaigns.mockRejectedValue(new EmployeeAccessError("forbidden"));

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Company admin access required." });
  });

  it("returns a safe validation response", async () => {
    mockCreateCompanyCampaign.mockRejectedValue(
      new CampaignManagementError("invalid", "A valid official deadline is required.")
    );

    const response = await POST(new Request("https://safetyxp.example/api/admin/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Safety", officialDeadline: "not-a-date" }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "A valid official deadline is required.",
    });
  });
});
