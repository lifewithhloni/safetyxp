import { PROMPT_VERSION } from "@/services/ai/ai-schemas";

export function buildFlashcardPrompt(policyTitle: string, extractedText: string) {
  return `PROMPT_VERSION=${PROMPT_VERSION}\nGenerate concise policy flashcards from supplied policy text only.\nReturn strict JSON array:\n{id,front,back,category,difficulty,sourceReference,status}\nStatus must be AI_GENERATED.\n\nPolicy title: ${policyTitle}\nPolicy text:\n${extractedText}`;
}
