export type MissionType = "lesson" | "quiz" | "scenario" | "flashcards" | "review" | "finalAssessment";

export type DailyMissionStatus = "Not Started" | "Available" | "In Progress" | "Completed" | "Skipped" | "Overdue";

export interface LearningModule {
  id: string;
  campaignId: string;
  type: MissionType;
  title: string;
  description: string;
  estimatedMinutes: number;
  order: number;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  deadline: string;
  bufferDays: number;
  modules: LearningModule[];
}

export interface CampaignParticipant {
  campaignId: string;
  employeeId: string;
  assignedAt: string;
}

export interface DailyMission {
  id: string;
  campaignId: string;
  employeeId: string;
  scheduledDate: string;
  type: MissionType;
  title: string;
  description: string;
  estimatedMinutes: number;
  moduleId: string;
  status: DailyMissionStatus;
  completedAt?: string;
  xpReward: number;
  order: number;
}

export interface MissionProgress {
  employeeId: string;
  campaignId: string;
  completedMissions: number;
  totalMissions: number;
  completionRate: number;
  xpEarned: number;
  overdueCount: number;
}
