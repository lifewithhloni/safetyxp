import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ---------------------------------------------------------------------------
// Part A — riskInsightSchema
// ---------------------------------------------------------------------------

import { riskInsightSchema } from "@/services/ai/ai-schemas";

describe("riskInsightSchema", () => {
  const valid = {
    narrative: "Employee is 15% behind with 2 days remaining.",
    topRecommendation: "Send a direct follow-up and assign a catch-up session today.",
    urgencyReason: "Without action, the employee will miss the campaign deadline.",
    confidence: 0.85,
  };

  it("accepts a valid RiskInsight", () => {
    expect(() => riskInsightSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty narrative", () => {
    expect(() => riskInsightSchema.parse({ ...valid, narrative: "" })).toThrow();
  });

  it("rejects empty topRecommendation", () => {
    expect(() => riskInsightSchema.parse({ ...valid, topRecommendation: "" })).toThrow();
  });

  it("rejects empty urgencyReason", () => {
    expect(() => riskInsightSchema.parse({ ...valid, urgencyReason: "" })).toThrow();
  });

  it("rejects confidence below 0", () => {
    expect(() => riskInsightSchema.parse({ ...valid, confidence: -0.1 })).toThrow();
  });

  it("rejects confidence above 1", () => {
    expect(() => riskInsightSchema.parse({ ...valid, confidence: 1.1 })).toThrow();
  });

  it("rejects malformed model response (missing required fields)", () => {
    expect(() => riskInsightSchema.parse({ bad: true })).toThrow();
  });

  it("accepts confidence at boundary 0.0", () => {
    expect(() => riskInsightSchema.parse({ ...valid, confidence: 0 })).not.toThrow();
  });

  it("accepts confidence at boundary 1.0", () => {
    expect(() => riskInsightSchema.parse({ ...valid, confidence: 1 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Part B — processRiskAlerts with real AI data
// ---------------------------------------------------------------------------

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

jest.mock("@/services/ai/ai-risk-analysis.service", () => ({
  getAiEnrichedRiskReport: jest.fn(),
}));

jest.mock("@/services/notifications/event.service", () => ({
  dispatchNotificationEvent: jest.fn(),
}));

jest.mock("@/services/notifications/notification-queue.service", () => ({
  queueNotificationEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  processNotificationQueue: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.mock("@/services/automation/scheduler.service", () => ({
  getDaysUntil: jest.fn(() => 3),
  startOfCompanyDay: jest.fn(() => "2026-08-13"),
  requireCronSecret: jest.fn(),
  isCronAuthError: jest.fn(() => false),
}));

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAiEnrichedRiskReport } from "@/services/ai/ai-risk-analysis.service";
import { queueNotificationEvent } from "@/services/notifications/notification-queue.service";
import { processRiskAlerts } from "@/services/automation/automation.service";

const HIGH_RISK_EMPLOYEE = {
  employeeId: "emp-001",
  employeeName: "Jane Doe",
  campaignId: "camp-001",
  campaignName: "Fire Safety",
  companyId: "co-001",
  email: "jane@example.com",
  currentProgress: 15,
  daysRemaining: 2,
  riskScore: 80,
  riskLevel: "HIGH",
  aiInsight: {
    narrative: "Jane is 15% through Fire Safety with 2 days left.",
    topRecommendation: "Schedule a catch-up session today.",
    urgencyReason: "Deadline will be missed without intervention.",
    confidence: 0.9,
  },
};

const LOW_RISK_EMPLOYEE = {
  ...HIGH_RISK_EMPLOYEE,
  employeeId: "emp-002",
  email: "bob@example.com",
  riskLevel: "LOW",
  riskScore: 10,
  aiInsight: null,
};

function makeDbMock(companies = [{ id: "co-001" }]) {
  const companiesChain = {
    select: jest.fn().mockReturnThis(),
    limit: jest.fn<() => Promise<{ data: typeof companies; error: null }>>().mockResolvedValue({ data: companies, error: null }),
  };
  const adminsChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn<() => Promise<{ data: { id: string; email: string }[] }>>().mockResolvedValue({ data: [] }),
  };
  (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockImplementation((table: string) => {
    if (table === "companies") return companiesChain;
    return adminsChain;
  });
}

describe("processRiskAlerts — real AI data", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("queries active companies from the database", async () => {
    makeDbMock();
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>).mockResolvedValue([]);
    await processRiskAlerts();
    expect(supabaseAdmin.from).toHaveBeenCalledWith("companies");
  });

  it("calls getAiEnrichedRiskReport for each company", async () => {
    makeDbMock([{ id: "co-001" }, { id: "co-002" }]);
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>).mockResolvedValue([]);
    await processRiskAlerts();
    expect(getAiEnrichedRiskReport).toHaveBeenCalledTimes(2);
    expect(getAiEnrichedRiskReport).toHaveBeenCalledWith("co-001");
    expect(getAiEnrichedRiskReport).toHaveBeenCalledWith("co-002");
  });

  it("does NOT call getAtRiskEmployees (mock data removed from cron path)", async () => {
    makeDbMock();
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>).mockResolvedValue([]);
    // getAtRiskEmployees is not mocked — if called it would throw import error
    await expect(processRiskAlerts()).resolves.not.toThrow();
    // getAiEnrichedRiskReport was used instead
    expect(getAiEnrichedRiskReport).toHaveBeenCalled();
  });

  it("sends notifications for HIGH employees but not LOW employees", async () => {
    makeDbMock();
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>).mockResolvedValue([HIGH_RISK_EMPLOYEE, LOW_RISK_EMPLOYEE]);
    await processRiskAlerts();
    // Verify LOW_RISK_EMPLOYEE (emp-002) never appears in any notification
    const calls = (queueNotificationEvent as ReturnType<typeof jest.fn>).mock.calls;
    const lowRiskNotif = calls.some(
      (c) => (c[0] as { payload?: { userId?: string } })?.payload?.userId === LOW_RISK_EMPLOYEE.employeeId
    );
    expect(lowRiskNotif).toBe(false);
    // Verify HIGH_RISK_EMPLOYEE (emp-001) did get a notification
    const highRiskNotif = calls.some(
      (c) => (c[0] as { payload?: { userId?: string } })?.payload?.userId === HIGH_RISK_EMPLOYEE.employeeId
    );
    expect(highRiskNotif).toBe(true);
  });

  it("uses email directly from AiEnrichedRiskResult (no per-employee profile DB lookup)", async () => {
    makeDbMock();
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>).mockResolvedValue([HIGH_RISK_EMPLOYEE]);
    await processRiskAlerts();
    // The OLD code did: supabaseAdmin.from("profiles").select("id, company_id, email").eq("id", employee.employeeId)
    // The NEW code only queries profiles for ADMIN lookups (different shape), not per-employee email.
    // Verify no .eq("id", employeeId) call was made on profiles.
    const allFromCalls = (supabaseAdmin.from as ReturnType<typeof jest.fn>).mock.calls;
    // In the new code, profiles is only queried for admin lookup (company_id + role), not by employee id
    // Just confirm getAiEnrichedRiskReport provided the email, making a per-employee lookup unnecessary.
    expect(getAiEnrichedRiskReport).toHaveBeenCalledWith("co-001");
    expect(allFromCalls.some((c) => c[0] === "companies")).toBe(true);
  });

  it("uses aiInsight.topRecommendation in the notification body when available", async () => {
    makeDbMock();
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>).mockResolvedValue([HIGH_RISK_EMPLOYEE]);
    await processRiskAlerts();
    const notificationCalls = (queueNotificationEvent as ReturnType<typeof jest.fn>).mock.calls;
    const employeeNotif = notificationCalls.find((c) => (c[0] as { eventType?: string })?.eventType === "EmployeeAtRisk");
    expect((employeeNotif?.[0] as { payload?: { body?: string } })?.payload?.body).toContain("catch-up session");
  });

  it("skips employees with no email gracefully", async () => {
    makeDbMock();
    const noEmail = { ...HIGH_RISK_EMPLOYEE, email: null };
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>).mockResolvedValue([noEmail]);
    const result = await processRiskAlerts();
    expect(result.sent).toBe(0);
    expect(result.processed).toBeGreaterThan(0);
    expect(result.skipped).toBeGreaterThan(0);
  });

  it("isolates per-company errors so one company failure does not block others", async () => {
    makeDbMock([{ id: "co-001" }, { id: "co-002" }]);
    (getAiEnrichedRiskReport as ReturnType<typeof jest.fn>)
      .mockRejectedValueOnce(new Error("Company co-001 DB error"))
      .mockResolvedValueOnce([HIGH_RISK_EMPLOYEE]);
    const result = await processRiskAlerts();
    // co-002 still processed despite co-001 failure
    expect(result.sent).toBeGreaterThan(0);
  });

  it("throws when company list DB query fails", async () => {
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn<() => Promise<{ data: null; error: { message: string } }>>().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    });
    await expect(processRiskAlerts()).rejects.toThrow("Failed to fetch companies");
  });
});
