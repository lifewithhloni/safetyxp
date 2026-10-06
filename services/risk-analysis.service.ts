import { mockEmployees } from "@/services/employee-management";
import { getCampaignById, getMockCampaigns } from "@/services/campaign.service";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface EmployeeRiskInput {
  employeeId: string;
  employeeName: string;
  campaignName: string;
  currentProgress: number;
  status: string;
  lastActivity: string;
  timeRemaining: string;
  lessonsCompleted: number;
  totalLessons: number;
  daysRemaining?: number;
  missedMissions?: number;
  completionVelocity?: number;
  requiredDailyLearning?: number;
}

export interface EmployeeRiskResult {
  employeeId: string;
  employeeName: string;
  campaignId: string;
  campaignName: string;
  currentProgress: number;
  daysRemaining: number;
  requiredDailyLearning: number;
  missedMissions: number;
  completionVelocity: number;
  previousCompletionBehavior: string;
  riskLevel: RiskLevel;
  riskScore: number;
  predictedCompletionDate: string;
  daysAheadOrBehind: number;
  recommendedAction: string;
  summary: string;
}

export interface CampaignRiskResult {
  campaignId: string;
  campaignName: string;
  totalEmployees: number;
  atRiskEmployees: number;
  averageRiskScore: number;
  riskLevel: RiskLevel;
  predictedCompletionDate: string;
  daysAheadOrBehind: number;
  recommendedAction: string;
}

function parseDaysRemaining(daysText: string): number {
  if (daysText.toLowerCase().includes("completed")) {
    return 0;
  }
  const match = daysText.match(/(\d+)\s*day/);
  return match ? Number(match[1]) : 7;
}

function parseLastActivityDays(lastActivity: string): number {
  if (lastActivity.toLowerCase().includes("today") || lastActivity.toLowerCase().includes("hour")) {
    return 0;
  }
  if (lastActivity.toLowerCase().includes("yesterday")) {
    return 1;
  }
  const match = lastActivity.match(/(\d+)\s*day/);
  return match ? Number(match[1]) : 7;
}

function findCampaignForEmployee(campaignName: string) {
  const normalized = campaignName.toLowerCase();
  const direct = getCampaignById(campaignName);
  if (direct) {
    return direct;
  }

  return getMockCampaigns().find((campaign) => {
    const title = campaign.title.toLowerCase();
    return title === normalized || title.includes(normalized) || normalized.includes(title);
  });
}

export function calculateRiskScore(input: EmployeeRiskInput): number {
  const {
    currentProgress,
    daysRemaining = 0,
    missedMissions = 0,
    completionVelocity = 0,
    status,
    requiredDailyLearning = 0,
  } = input;
  let score = 0;

  if (currentProgress < 30) score += 25;
  else if (currentProgress < 50) score += 18;
  else if (currentProgress < 70) score += 10;

  if (status === "Overdue") score += 25;
  if (missedMissions >= 2) score += 20;
  if (missedMissions === 1) score += 10;

  if (completionVelocity === 0) score += 30;
  else if (completionVelocity < 5) score += 18;
  else if (completionVelocity < 10) score += 10;

  if (requiredDailyLearning >= 15) score += 18;
  else if (requiredDailyLearning >= 10) score += 10;

  if (daysRemaining <= 2 && currentProgress < 100) score += 20;
  if (daysRemaining <= 5 && currentProgress < 80) score += 10;

  return Math.min(100, Math.max(0, score));
}

export function predictCompletion(input: EmployeeRiskInput, referenceDate: Date = new Date()): { predictedCompletionDate: string; daysAheadOrBehind: number } {
  const deadline = findCampaignForEmployee(input.campaignName)?.deadline ?? new Date(referenceDate).toISOString().split("T")[0];
  const targetVelocity = input.completionVelocity && input.completionVelocity > 0 ? input.completionVelocity : 1;
  const remainingProgress = Math.max(0, 100 - input.currentProgress);
  const estimatedDaysToFinish = Math.ceil(remainingProgress / targetVelocity);

  const predictedDate = new Date(referenceDate);
  predictedDate.setDate(predictedDate.getDate() + estimatedDaysToFinish);

  const deadlineDate = new Date(deadline);
  const diff = Math.ceil((deadlineDate.getTime() - predictedDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    predictedCompletionDate: predictedDate.toISOString().split("T")[0],
    daysAheadOrBehind: diff,
  };
}

function getCompletionBehavior(input: EmployeeRiskInput): string {
  const velocity = input.completionVelocity ?? 0;

  if (input.currentProgress === 100) {
    return "Consistent completion";
  }

  if (velocity === 0) {
    return "No recent progress";
  }

  if (velocity < 5) {
    return "Slower than expected";
  }

  if (velocity <= 10) {
    return "Steady completion";
  }

  return "Ahead of pace";
}

export function getRecommendedActions(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case "LOW":
      return "Continue monitoring progress and keep the current schedule.";
    case "MEDIUM":
      return "Send a reminder and provide a short progress update to the employee.";
    case "HIGH":
      return "Send reminder, notify the manager, and encourage daily completion targets.";
    case "CRITICAL":
      return "Escalate to the manager immediately, assign support, and reset the learning plan.";
    default:
      return "Review campaign progress and adjust learning cadence as needed.";
  }
}

export function determineRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function buildEmployeeRiskRecord(employee: EmployeeRiskInput, referenceDate: Date = new Date()): EmployeeRiskResult {
  const daysRemaining = parseDaysRemaining(employee.timeRemaining);
  const missedMissions = employee.status === "Overdue" ? 2 : parseLastActivityDays(employee.lastActivity) >= 3 ? 1 : 0;
  const completionVelocity = Math.max(0, Math.round(employee.currentProgress / Math.max(1, 10 - daysRemaining)));
  const requiredDailyLearning = daysRemaining > 0 ? Number(((100 - employee.currentProgress) / daysRemaining).toFixed(1)) : 100;
  const { predictedCompletionDate, daysAheadOrBehind } = predictCompletion({
    ...employee,
    daysRemaining,
    missedMissions,
    completionVelocity,
    requiredDailyLearning,
  }, referenceDate);

  const riskScore = calculateRiskScore({
    ...employee,
    daysRemaining,
    missedMissions,
    completionVelocity,
    requiredDailyLearning,
  });

  const riskLevel = determineRiskLevel(riskScore);
  const campaign = findCampaignForEmployee(employee.campaignName);

  return {
    employeeId: employee.employeeId,
    employeeName: employee.employeeName,
    campaignId: campaign?.id ?? "unknown",
    campaignName: campaign?.title ?? employee.campaignName,
    currentProgress: employee.currentProgress,
    daysRemaining,
    requiredDailyLearning,
    missedMissions,
    completionVelocity,
    previousCompletionBehavior: getCompletionBehavior({
      ...employee,
      daysRemaining,
      missedMissions,
      completionVelocity,
      requiredDailyLearning,
    }),
    riskLevel,
    riskScore,
    predictedCompletionDate,
    daysAheadOrBehind,
    recommendedAction: getRecommendedActions(riskLevel),
    summary: `Risk profile for ${employee.employeeName} on ${employee.campaignName}: ${riskLevel} risk with a predicted completion date of ${predictedCompletionDate}.`,
  };
}

export function getAtRiskEmployees(campaignId?: string): EmployeeRiskResult[] {
  const results = mockEmployees
    .map((employee) =>
      buildEmployeeRiskRecord({
        employeeId: employee.id,
        employeeName: employee.name,
        campaignName: employee.campaign,
        currentProgress: employee.progress,
        status: employee.status,
        lastActivity: employee.lastActivity,
        timeRemaining: employee.timeRemaining,
        lessonsCompleted: employee.lessonsCompleted,
        totalLessons: employee.totalLessons,
      })
    )
    .filter((risk) => risk.riskLevel !== "LOW");

  return campaignId ? results.filter((risk) => risk.campaignId === campaignId) : results;
}

export function getCampaignRisk(campaignId: string): CampaignRiskResult {
  const employees = mockEmployees.filter((employee) => {
    const campaign = findCampaignForEmployee(employee.campaign);
    return campaign?.id === campaignId;
  });

  const riskRecords = employees.map((employee) =>
    buildEmployeeRiskRecord({
      employeeId: employee.id,
      employeeName: employee.name,
      campaignName: employee.campaign,
      currentProgress: employee.progress,
      status: employee.status,
      lastActivity: employee.lastActivity,
      timeRemaining: employee.timeRemaining,
      lessonsCompleted: employee.lessonsCompleted,
      totalLessons: employee.totalLessons,
    })
  );

  const averageRiskScore = riskRecords.length
    ? Math.round(riskRecords.reduce((sum, item) => sum + item.riskScore, 0) / riskRecords.length)
    : 0;
  const atRiskEmployees = riskRecords.filter((item) => item.riskLevel !== "LOW").length;
  const campaign = getCampaignById(campaignId);
  const riskLevel = determineRiskLevel(averageRiskScore);
  const predictedDate = riskRecords.reduce((latest, next) => {
    return new Date(next.predictedCompletionDate) > new Date(latest) ? next.predictedCompletionDate : latest;
  }, new Date().toISOString().split("T")[0]);
  const predictedDaysAhead = riskRecords.reduce((min, next) => Math.min(min, next.daysAheadOrBehind), Number.POSITIVE_INFINITY);

  return {
    campaignId,
    campaignName: campaign?.title ?? campaignId,
    totalEmployees: employees.length,
    atRiskEmployees,
    averageRiskScore,
    riskLevel,
    predictedCompletionDate: predictedDate,
    daysAheadOrBehind: Number.isFinite(predictedDaysAhead) ? predictedDaysAhead : 0,
    recommendedAction: getRecommendedActions(riskLevel),
  };
}
