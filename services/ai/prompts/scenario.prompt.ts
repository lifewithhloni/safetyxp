import { PROMPT_VERSION } from "@/services/ai/ai-schemas";

export function buildScenarioPrompt(policyTitle: string, extractedText: string) {
  return `PROMPT_VERSION=${PROMPT_VERSION}\nGenerate realistic workplace scenarios based only on supplied policy text.\nReturn strict JSON array:\n{id,title,situation,options[],correctResponse,explanation,learningObjective,sourceReference,xpReward,status}\nStatus must be AI_GENERATED.\n\nPolicy title: ${policyTitle}\nPolicy text:\n${extractedText}`;
}
