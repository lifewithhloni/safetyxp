import { PROMPT_VERSION } from "@/services/ai/ai-schemas";

export function buildSummaryPrompt(policyTitle: string, extractedText: string) {
  return `PROMPT_VERSION=${PROMPT_VERSION}\nGenerate employee-friendly safety policy summary content grounded only in the provided text.\nReturn strict JSON:\n{ shortSummary, keyTakeaways[], importantWarnings[] }\n\nPolicy title: ${policyTitle}\nPolicy text:\n${extractedText}`;
}
