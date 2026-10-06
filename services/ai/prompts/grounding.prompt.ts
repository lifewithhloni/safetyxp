import { PROMPT_VERSION } from "@/services/ai/ai-schemas";

export function buildGroundingPrompt(policyTitle: string, extractedText: string, generatedJson: string) {
  return `PROMPT_VERSION=${PROMPT_VERSION}\nEvaluate grounding fidelity for generated safety training content.\nCheck if claims are traceable to source policy text.\nReturn strict JSON:\n{ grounded, confidence, issues:[{message,severity}], sourceReferences[] }\n\nPolicy title: ${policyTitle}\nPolicy text:\n${extractedText}\n\nGenerated content:\n${generatedJson}`;
}
