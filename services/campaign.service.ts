import type { Campaign, CampaignParticipant, LearningModule } from "@/types/scheduling";

const mockCampaigns: Campaign[] = [
  {
    id: "campaign-fire-safety",
    title: "Fire Safety",
    description: "Structured learning to keep field teams safe around fire hazards.",
    publishedAt: "2026-07-15",
    deadline: "2026-09-30",
    bufferDays: 2,
    modules: [
      { id: "mod-001", campaignId: "campaign-fire-safety", type: "lesson", title: "Fire safety fundamentals", description: "Core concepts and emergency procedures.", estimatedMinutes: 12, order: 1 },
      { id: "mod-002", campaignId: "campaign-fire-safety", type: "quiz", title: "Fire safety quick check", description: "Reinforce the most important concepts.", estimatedMinutes: 8, order: 2 },
      { id: "mod-003", campaignId: "campaign-fire-safety", type: "scenario", title: "Blocked exit drill", description: "Respond to a real-world warehouse evacuation issue.", estimatedMinutes: 14, order: 3 },
      { id: "mod-004", campaignId: "campaign-fire-safety", type: "lesson", title: "Emergency equipment", description: "How to inspect and use fire response gear.", estimatedMinutes: 10, order: 4 },
      { id: "mod-005", campaignId: "campaign-fire-safety", type: "quiz", title: "Equipment readiness quiz", description: "Confirm knowledge of tools and procedures.", estimatedMinutes: 9, order: 5 },
      { id: "mod-006", campaignId: "campaign-fire-safety", type: "review", title: "Safety summary review", description: "Review the campaign highlights and requirements.", estimatedMinutes: 8, order: 6 },
      { id: "mod-007", campaignId: "campaign-fire-safety", type: "finalAssessment", title: "Fire safety assessment", description: "Final assessment for campaign completion.", estimatedMinutes: 15, order: 7 },
    ],
  },
];

const mockParticipants: CampaignParticipant[] = [
  { campaignId: "campaign-fire-safety", employeeId: "emp-001", assignedAt: "2026-07-15" },
  { campaignId: "campaign-fire-safety", employeeId: "emp-002", assignedAt: "2026-07-15" },
  { campaignId: "campaign-fire-safety", employeeId: "emp-003", assignedAt: "2026-07-15" },
];

export function getCampaignById(campaignId: string): Campaign | undefined {
  return mockCampaigns.find((campaign) => campaign.id === campaignId);
}

export function getParticipantsForCampaign(campaignId: string): CampaignParticipant[] {
  return mockParticipants.filter((participant) => participant.campaignId === campaignId);
}

export function getCampaignModules(campaignId: string): LearningModule[] {
  const campaign = getCampaignById(campaignId);
  return campaign ? [...campaign.modules].sort((a, b) => a.order - b.order) : [];
}

export function getMockCampaigns(): Campaign[] {
  return mockCampaigns;
}
