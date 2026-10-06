import { PROMPT_VERSION } from "@/services/ai/ai-schemas";

export function buildPolicyAnalysisPrompt(policyTitle: string, extractedText: string) {
  return `PROMPT_VERSION=${PROMPT_VERSION}\nYou are a safety compliance content assistant.\nUse ONLY the supplied policy text.\nIf information is ambiguous, add it to ambiguities.\nDo not invent company-specific rules or procedures.\n\nReturn strictly valid JSON with fields:\n{ title, summary, topics[], learningObjectives[], keyRules[], riskAreas[], importantWarnings[], sections[], ambiguities[] }\n\nPolicy title: ${policyTitle}\n\nPolicy text:\n${extractedText}`;
}
