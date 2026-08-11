import { calculateRiskScore, predictCompletion, getAtRiskEmployees, getCampaignRisk } from "@/services/risk-analysis.service";

describe("risk-analysis.service", () => {
  it("calculates a reasonable risk score for a low-progress employee", () => {
    const score = calculateRiskScore({
      employeeId: "emp-100",
      employeeName: "Test User",
      campaignName: "Fire Safety",
      currentProgress: 28,
      status: "In Progress",
      lastActivity: "3 days ago",
      timeRemaining: "4 days",
      lessonsCompleted: 4,
      totalLessons: 20,
      daysRemaining: 4,
      missedMissions: 1,
      completionVelocity: 5,
      requiredDailyLearning: 18,
    } as any);

    expect(score).toBeGreaterThanOrEqual(55);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("predicts completion dates near or after the deadline for slow progress", () => {
    const result = predictCompletion({
      employeeId: "emp-100",
      employeeName: "Test User",
      campaignName: "Fire Safety",
      currentProgress: 42,
      status: "In Progress",
      lastActivity: "Yesterday",
      timeRemaining: "6 days",
      lessonsCompleted: 10,
      totalLessons: 20,
      daysRemaining: 6,
      missedMissions: 1,
      completionVelocity: 5,
      requiredDailyLearning: 10,
    } as any, new Date("2026-08-20"));

    expect(new Date(result.predictedCompletionDate).getTime()).toBeGreaterThanOrEqual(new Date("2026-08-30").getTime());
  });

  it("identifies at-risk employees from mock data", () => {
    const atRisk = getAtRiskEmployees();
    expect(atRisk.length).toBeGreaterThan(0);
    expect(atRisk.every((item) => item.riskLevel !== "LOW")).toBe(true);
  });

  it("builds campaign risk summary for Fire Safety", () => {
    const campaignRisk = getCampaignRisk("campaign-fire-safety");
    expect(campaignRisk.campaignId).toBe("campaign-fire-safety");
    expect(campaignRisk.totalEmployees).toBeGreaterThanOrEqual(1);
  });
});
