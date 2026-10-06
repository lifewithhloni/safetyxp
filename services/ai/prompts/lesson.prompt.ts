import { PROMPT_VERSION } from "@/services/ai/ai-schemas";

export function buildLessonPrompt(policyTitle: string, extractedText: string) {
  return `PROMPT_VERSION=${PROMPT_VERSION}\nGenerate ordered lesson modules for policy training.\nEach lesson must be 5-15 minutes and include source references with section and excerpt.\nReturn strict JSON array of lessons with:\n{id,title,description,content,estimatedMinutes,learningObjectives[],order,sourceReferences[],status}\nStatus must be AI_GENERATED.\n\nPolicy title: ${policyTitle}\nPolicy text:\n${extractedText}`;
}
