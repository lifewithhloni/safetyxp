export type CampaignStatus = "DRAFT" | "PROCESSING" | "READY" | "PUBLISHED" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export type CampaignModuleInput = {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes: number;
  orderIndex: number;
  type: "lesson" | "quiz" | "scenario" | "flashcards" | "review" | "finalAssessment";
};

export type CampaignPlanInput = {
  companyId: string;
  name: string;
  officialDeadline: string;
  bufferDays?: number;
  description?: string;
  modules: CampaignModuleInput[];
};

export function calculateLearningDeadline(officialDeadline: string, bufferDays = 2) {
  const deadline = new Date(officialDeadline);
  deadline.setDate(deadline.getDate() - bufferDays);
  return deadline.toISOString().split("T")[0];
}

export function normalizeCampaignStatus(status?: string | null) {
  const value = (status ?? "draft").trim().toLowerCase();

  switch (value) {
    case "draft":
      return "DRAFT";
    case "processing":
      return "PROCESSING";
    case "active":
    case "ready":
      return "READY";
    case "published":
      return "PUBLISHED";
    case "paused":
      return "PAUSED";
    case "completed":
      return "COMPLETED";
    case "archived":
      return "ARCHIVED";
    default:
      return "DRAFT";
  }
}

export function createCampaignPlan(input: CampaignPlanInput) {
  const bufferDays = input.bufferDays ?? 2;
  const learningDeadline = calculateLearningDeadline(input.officialDeadline, bufferDays);

  return {
    companyId: input.companyId,
    name: input.name,
    description: input.description ?? "",
    officialDeadline: input.officialDeadline,
    learningDeadline,
    bufferDays,
    status: "DRAFT" as CampaignStatus,
    modules: [...input.modules].sort((a, b) => a.orderIndex - b.orderIndex),
  };
}
