export type AiGenerationAccessContext = {
  requesterRole: "employee" | "admin" | "super_admin";
  requesterCompanyId: string;
  policyCompanyId: string;
  policyDocumentCompanyId: string;
};

export function canTriggerAiGeneration(context: AiGenerationAccessContext) {
  if (context.requesterRole !== "admin" && context.requesterRole !== "super_admin") {
    return false;
  }

  if (context.requesterCompanyId !== context.policyCompanyId) {
    return false;
  }

  if (context.requesterCompanyId !== context.policyDocumentCompanyId) {
    return false;
  }

  return true;
}

export function canEmployeeReadGeneratedContent(status: string) {
  return status === "PUBLISHED";
}
