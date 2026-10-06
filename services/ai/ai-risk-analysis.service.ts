import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAIProvider } from "@/services/ai/ai-provider-factory";
import { calculateRiskScore, determineRiskLevel } from "@/services/risk-analysis.service";
import type { EmployeeRiskContext, RiskInsight } from "@/services/ai/ai-provider";

export interface AiEnrichedRiskResult {
  employeeId: string;
  employeeName: string;
  campaignId: string;
  campaignName: string;
  companyId: string;
  email: string | null;
  currentProgress: number;
  daysRemaining: number;
  riskScore: number;
  riskLevel: string;
  aiInsight: RiskInsight | null;
}

type ParticipantRow = {
  employee_id: string;
  progress: number;
  status: string;
  campaigns: {
    id: string;
    company_id: string;
    name: string;
    learning_deadline: string | null;
  } | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 7;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Fetches real campaign participant data from the database, calculates risk scores,
 * and enriches HIGH/CRITICAL entries with AI-generated narrative insights.
 */
export async function getAiEnrichedRiskReport(companyId: string): Promise<AiEnrichedRiskResult[]> {
  const { data, error } = await supabaseAdmin
    .from("campaign_participants")
    .select(`
      employee_id,
      progress,
      status,
      campaigns(id, company_id, name, learning_deadline),
      profiles(id, first_name, last_name, email)
    `)
    .eq("campaigns.company_id", companyId)
    .neq("status", "completed");

  if (error || !data) {
    throw new Error("Failed to fetch campaign participants for risk analysis.");
  }

  const provider = getAIProvider();
  const results: AiEnrichedRiskResult[] = [];

  for (const row of (data as unknown) as ParticipantRow[]) {
    const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    if (!campaign || !profile) continue;

    const daysRemaining = daysUntil(campaign.learning_deadline);
    const currentProgress = row.progress ?? 0;
    const employeeName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown";

    const riskInput = {
      employeeId: row.employee_id,
      employeeName,
      campaignName: campaign.name,
      currentProgress,
      status: row.status,
      lastActivity: "unknown",
      timeRemaining: `${daysRemaining} days`,
      lessonsCompleted: 0,
      totalLessons: 0,
      daysRemaining,
      missedMissions: row.status === "overdue" ? 2 : 0,
      completionVelocity: daysRemaining > 0 ? Math.round(currentProgress / Math.max(1, 30 - daysRemaining)) : 0,
      requiredDailyLearning: daysRemaining > 0 ? Math.round((100 - currentProgress) / daysRemaining) : 100,
    };

    const riskScore = calculateRiskScore(riskInput);
    const riskLevel = determineRiskLevel(riskScore);

    let aiInsight: RiskInsight | null = null;

    if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
      const context: EmployeeRiskContext = {
        employeeName,
        campaignName: campaign.name,
        currentProgress,
        daysRemaining,
        missedMissions: riskInput.missedMissions,
        completionVelocity: riskInput.completionVelocity,
        riskScore,
        riskLevel,
      };

      const insightResult = await provider.generateRiskInsight(context);
      if (insightResult.success) {
        aiInsight = insightResult.data;
      }
    }

    results.push({
      employeeId: row.employee_id,
      employeeName,
      campaignId: campaign.id,
      campaignName: campaign.name,
      companyId: campaign.company_id,
      email: profile.email ?? null,
      currentProgress,
      daysRemaining,
      riskScore,
      riskLevel,
      aiInsight,
    });
  }

  return results.sort((a, b) => b.riskScore - a.riskScore);
}
