import type { EmployeeRiskContext } from "@/services/ai/ai-provider";

export function buildRiskInsightPrompt(context: EmployeeRiskContext): string {
  return `You are a workplace safety training compliance analyst.
Analyse the following employee training situation and return a concise JSON risk insight.

Employee: ${context.employeeName}
Campaign: ${context.campaignName}
Progress: ${context.currentProgress}%
Days remaining: ${context.daysRemaining}
Missed missions: ${context.missedMissions}
Completion velocity (% per day): ${context.completionVelocity}
Risk score: ${context.riskScore}/100
Risk level: ${context.riskLevel}

Return strictly valid JSON with these fields:
{
  "narrative": "<2–3 sentence explanation of why this employee is at risk, referencing the specific numbers>",
  "topRecommendation": "<one concrete action a manager or the system should take now>",
  "urgencyReason": "<one sentence on what will happen if no action is taken>",
  "confidence": <number between 0.5 and 1.0>
}`;
}
