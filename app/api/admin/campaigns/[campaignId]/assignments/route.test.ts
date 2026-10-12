import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type {
  AssignCampaignEmployeesResult,
  CampaignAssignmentData,
} from "@/services/admin/campaign-management.service";

const getCampaignAssignmentDataMock = jest.fn<(campaignId: string) => Promise<CampaignAssignmentData>>();
const assignEmployeesToCampaignMock = jest.fn<
  (campaignId: string, input: { employeeIds: string[] }) => Promise<AssignCampaignEmployeesResult>
>();

jest.mock("@/services/admin/campaign-management.service", () => ({
  CampaignManagementError: class CampaignManagementError extends Error {
    constructor(readonly code: string, message: string) {
      super(message);
    }
  },
  assignEmployeesToCampaign: (...args: [string, { employeeIds: string[] }]) =>
    assignEmployeesToCampaignMock(...args),
  getCampaignAssignmentData: (...args: [string]) => getCampaignAssignmentDataMock(...args),
}));

jest.mock("@/services/admin/employee-management.service", () => ({
  EmployeeAccessError: class EmployeeAccessError extends Error {
    constructor(readonly reason: "unauthenticated" | "forbidden") {
      super(reason);
    }
  },
}));

import { CampaignManagementError } from "@/services/admin/campaign-management.service";
import { EmployeeAccessError } from "@/services/admin/employee-management.service";
import { GET, POST } from "./route";

const context = { params: Promise.resolve({ campaignId: "campaign-real-id" }) };
const data: CampaignAssignmentData = {
  eligibleEmployees: [{
    id: "employee-real-id",
    first_name: "Avery",
    last_name: "Employee",
    email: "avery@example.test",
    employee_number: null,
  }],
  participants: [],
};

describe("campaign assignments route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns real company-scoped assignment data", async () => {
    getCampaignAssignmentDataMock.mockResolvedValue(data);

    const response = await GET(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(data);
    expect(getCampaignAssignmentDataMock).toHaveBeenCalledWith("campaign-real-id");
  });

  it("requires a valid employee ID list and ignores untrusted privileged fields", async () => {
    const result: AssignCampaignEmployeesResult = {
      ...data,
      newlyAssignedEmployeeIds: ["employee-real-id"],
      alreadyAssignedEmployeeIds: [],
    };
    assignEmployeesToCampaignMock.mockResolvedValue(result);

    const response = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeIds: ["employee-real-id"],
        company_id: "attacker-company",
        status: "completed",
        completion_percentage: 100,
        xp: 10000,
      }),
    }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(assignEmployeesToCampaignMock).toHaveBeenCalledWith("campaign-real-id", {
      employeeIds: ["employee-real-id"],
    });
  });

  it("rejects malformed JSON and employee identifiers before calling the service", async () => {
    const malformed = await POST(new Request("http://localhost", {
      method: "POST",
      body: "{",
    }), context);
    expect(malformed.status).toBe(400);

    const invalid = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: ["employee-a", 42] }),
    }), context);
    expect(invalid.status).toBe(400);
    expect(assignEmployeesToCampaignMock).not.toHaveBeenCalled();
  });

  it("maps auth, ownership, and unexpected errors to safe responses", async () => {
    getCampaignAssignmentDataMock.mockRejectedValue(new EmployeeAccessError("unauthenticated"));
    expect((await GET(new Request("http://localhost"), context)).status).toBe(401);

    getCampaignAssignmentDataMock.mockRejectedValue(new EmployeeAccessError("forbidden"));
    expect((await GET(new Request("http://localhost"), context)).status).toBe(403);

    assignEmployeesToCampaignMock.mockRejectedValue(
      new CampaignManagementError("not_found", "Campaign not found.")
    );
    const missing = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: ["employee-a"] }),
    }), context);
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "Campaign not found." });

    assignEmployeesToCampaignMock.mockRejectedValue(new Error("private database details"));
    const unexpected = await POST(new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: ["employee-a"] }),
    }), context);
    expect(unexpected.status).toBe(500);
    await expect(unexpected.json()).resolves.toEqual({
      error: "Campaign assignments could not be completed. Please try again.",
    });
  });
});
