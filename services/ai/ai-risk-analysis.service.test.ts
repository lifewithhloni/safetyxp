import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

jest.mock("@/services/ai/ai-provider-factory", () => ({
  getAIProvider: jest.fn(),
}));

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAIProvider } from "@/services/ai/ai-provider-factory";
import { getAiEnrichedRiskReport } from "./ai-risk-analysis.service";

const mockHighRiskParticipant = {
  employee_id: "emp-001",
  progress: 15,
  status: "in_progress",
  campaigns: { id: "camp-001", company_id: "co-001", name: "Fire Safety", learning_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
  profiles: { id: "emp-001", first_name: "Jane", last_name: "Doe", email: "jane@example.com" },
};

const mockLowRiskParticipant = {
  employee_id: "emp-002",
  progress: 90,
  status: "in_progress",
  campaigns: { id: "camp-001", company_id: "co-001", name: "Fire Safety", learning_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
  profiles: { id: "emp-002", first_name: "Bob", last_name: "Smith", email: "bob@example.com" },
};

type DbRow = { data: unknown; error: null } | { data: null; error: { message: string } };

function makeDbChain(rows: unknown[]) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn<() => Promise<DbRow>>().mockResolvedValue({ data: rows as unknown, error: null }),
  };
}

type InsightResponse = { success: boolean; data: { narrative: string; topRecommendation: string; urgencyReason: string; confidence: number } };

function makeMockProvider(insightSuccess = true) {
  return {
    generateRiskInsight: jest.fn<() => Promise<InsightResponse>>().mockResolvedValue({
      success: insightSuccess,
      data: {
        narrative: "AI generated narrative.",
        topRecommendation: "Schedule a catch-up session.",
        urgencyReason: "Deadline approaching.",
        confidence: 0.85,
      },
    }),
  };
}

describe("getAiEnrichedRiskReport", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("returns enriched results sorted by risk score descending", async () => {
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue(makeDbChain([mockHighRiskParticipant, mockLowRiskParticipant]));
    (getAIProvider as ReturnType<typeof jest.fn>).mockReturnValue(makeMockProvider());

    const results = await getAiEnrichedRiskReport("co-001");

    expect(results.length).toBe(2);
    expect(results[0].riskScore).toBeGreaterThanOrEqual(results[1].riskScore);
  });

  it("calls generateRiskInsight only for HIGH/CRITICAL employees", async () => {
    const provider = makeMockProvider();
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue(makeDbChain([mockHighRiskParticipant, mockLowRiskParticipant]));
    (getAIProvider as ReturnType<typeof jest.fn>).mockReturnValue(provider);

    await getAiEnrichedRiskReport("co-001");

    expect(provider.generateRiskInsight).toHaveBeenCalledTimes(1);
    expect(provider.generateRiskInsight).toHaveBeenCalledWith(
      expect.objectContaining({ employeeName: "Jane Doe" })
    );
  });

  it("attaches AI insight to HIGH risk employees", async () => {
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue(makeDbChain([mockHighRiskParticipant]));
    (getAIProvider as ReturnType<typeof jest.fn>).mockReturnValue(makeMockProvider());

    const results = await getAiEnrichedRiskReport("co-001");

    expect(results[0].aiInsight).not.toBeNull();
    expect(results[0].aiInsight?.narrative).toBe("AI generated narrative.");
  });

  it("sets aiInsight to null for LOW risk employees", async () => {
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue(makeDbChain([mockLowRiskParticipant]));
    (getAIProvider as ReturnType<typeof jest.fn>).mockReturnValue(makeMockProvider());

    const results = await getAiEnrichedRiskReport("co-001");

    expect(results[0].aiInsight).toBeNull();
  });

  it("sets aiInsight to null when AI provider fails", async () => {
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue(makeDbChain([mockHighRiskParticipant]));
    (getAIProvider as ReturnType<typeof jest.fn>).mockReturnValue(makeMockProvider(false));

    const results = await getAiEnrichedRiskReport("co-001");

    expect(results[0].aiInsight).toBeNull();
  });

  it("throws when database query fails", async () => {
    const errNeqFn = jest.fn<() => Promise<DbRow>>().mockResolvedValue({ data: null, error: { message: "DB error" } });
    const errChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: errNeqFn,
    };
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue(errChain);
    (getAIProvider as ReturnType<typeof jest.fn>).mockReturnValue(makeMockProvider());

    await expect(getAiEnrichedRiskReport("co-001")).rejects.toThrow("Failed to fetch campaign participants");
  });

  it("skips rows missing campaign or profile data", async () => {
    const incomplete = { ...mockHighRiskParticipant, campaigns: null };
    (supabaseAdmin.from as ReturnType<typeof jest.fn>).mockReturnValue(makeDbChain([incomplete]));
    (getAIProvider as ReturnType<typeof jest.fn>).mockReturnValue(makeMockProvider());

    const results = await getAiEnrichedRiskReport("co-001");
    expect(results.length).toBe(0);
  });
});
