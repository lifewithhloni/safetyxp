import { PROMPT_VERSION } from "@/services/ai/ai-schemas";

export function buildQuizPrompt(policyTitle: string, extractedText: string) {
  return `PROMPT_VERSION=${PROMPT_VERSION}\nGenerate policy-grounded quiz questions with exactly one correct answer that appears in options.\nNo trick questions, no unsupported claims.\nReturn strict JSON array:\n{id,question,options[],correctAnswer,explanation,difficulty,xpReward,sourceReference,status}\nStatus must be AI_GENERATED.\n\nPolicy title: ${policyTitle}\nPolicy text:\n${extractedText}`;
}
