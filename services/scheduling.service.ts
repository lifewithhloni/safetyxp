import type { Campaign, CampaignParticipant, DailyMission, LearningModule, MissionProgress } from "@/types/scheduling";
import { getCampaignById, getParticipantsForCampaign } from "@/services/campaign.service";

let missionStore: DailyMission[] = [];

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getAvailableLearningDays(startDate: string, deadline: string, bufferDays: number): Date[] {
  const finalDate = new Date(deadline);
  finalDate.setDate(finalDate.getDate() - bufferDays);

  const start = new Date(startDate);
  const days: Date[] = [];
  const current = new Date(start);

  while (current <= finalDate) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function buildDailyMissions(campaign: Campaign, employeeId: string, assignedAt?: string | Date): DailyMission[] {
  const scheduleStart = assignedAt instanceof Date ? assignedAt.toISOString().split("T")[0] : assignedAt ?? campaign.publishedAt;
  const availableDays = getAvailableLearningDays(scheduleStart, campaign.deadline, campaign.bufferDays);
  const sortedModules = [...campaign.modules].sort((a, b) => a.order - b.order);

  if (availableDays.length === 0 || sortedModules.length === 0) {
    return [];
  }

  const totalMinutes = sortedModules.reduce((sum, module) => sum + module.estimatedMinutes, 0);
  const targetPerDay = Math.max(15, Math.ceil(totalMinutes / availableDays.length));

  const missions: DailyMission[] = [];
  let dayIndex = 0;
  let currentMinutes = 0;

  sortedModules.forEach((module) => {
    const moduleMinutes = module.estimatedMinutes;

    if (currentMinutes + moduleMinutes > targetPerDay && currentMinutes > 0 && dayIndex < availableDays.length - 1) {
      dayIndex += 1;
      currentMinutes = 0;
    }

    const scheduledDate = availableDays[Math.min(dayIndex, availableDays.length - 1)];
    missions.push({
      id: `${employeeId}-${campaign.id}-${module.id}`,
      campaignId: campaign.id,
      employeeId,
      scheduledDate: formatDate(scheduledDate),
      type: module.type,
      title: module.title,
      description: module.description,
      estimatedMinutes: module.estimatedMinutes,
      moduleId: module.id,
      status: "Not Started",
      xpReward: module.estimatedMinutes * 10,
      order: module.order,
    });

    currentMinutes += moduleMinutes;
    if (currentMinutes >= targetPerDay) {
      dayIndex += 1;
      currentMinutes = 0;
    }
  });

  return missions;
}

export function createCampaignSchedule(campaignId: string, referenceDate?: Date): DailyMission[] {
  const campaign = getCampaignById(campaignId);
  if (!campaign) {
    return [];
  }

  const participants = getParticipantsForCampaign(campaignId);
  const newMissions: DailyMission[] = [];

  participants.forEach((participant) => {
    const employeeMissions = buildDailyMissions(campaign, participant.employeeId, referenceDate);
    newMissions.push(...employeeMissions);
  });

  missionStore = newMissions;
  return newMissions;
}

export function generateDailyMissions(campaignId: string, referenceDate?: Date): DailyMission[] {
  return createCampaignSchedule(campaignId, referenceDate);
}

export function getTodaysMission(employeeId: string, referenceDate?: Date): DailyMission | null {
  if (!missionStore.length) {
    createCampaignSchedule("campaign-fire-safety", referenceDate);
  }

  const today = formatDate(referenceDate ? referenceDate : new Date());
  return missionStore.find((mission) => mission.employeeId === employeeId && mission.scheduledDate === today) ?? null;
}

export function completeMission(missionId: string): DailyMission | undefined {
  const mission = missionStore.find((item) => item.id === missionId);
  if (!mission) {
    return undefined;
  }

  if (mission.status !== "Completed") {
    mission.status = "Completed";
    mission.completedAt = new Date().toISOString();
  }

  return mission;
}

export function getEmployeeProgress(employeeId: string, campaignId: string): MissionProgress {
  if (!missionStore.length) {
    createCampaignSchedule("campaign-fire-safety");
  }

  const employeeMissions = missionStore.filter((mission) => mission.employeeId === employeeId && mission.campaignId === campaignId);
  const completedMissions = employeeMissions.filter((mission) => mission.status === "Completed").length;
  const overdueCount = employeeMissions.filter((mission) => mission.status === "Overdue").length;

  return {
    employeeId,
    campaignId,
    completedMissions,
    totalMissions: employeeMissions.length,
    completionRate: employeeMissions.length === 0 ? 0 : Math.round((completedMissions / employeeMissions.length) * 100),
    xpEarned: employeeMissions.filter((mission) => mission.status === "Completed").reduce((sum, mission) => sum + mission.xpReward, 0),
    overdueCount,
  };
}

export function getCampaignProgress(campaignId: string): MissionProgress {
  if (!missionStore.length) {
    createCampaignSchedule("campaign-fire-safety");
  }

  const campaignMissions = missionStore.filter((mission) => mission.campaignId === campaignId);
  const completedMissions = campaignMissions.filter((mission) => mission.status === "Completed").length;
  const overdueCount = campaignMissions.filter((mission) => mission.status === "Overdue").length;

  return {
    employeeId: "",
    campaignId,
    completedMissions,
    totalMissions: campaignMissions.length,
    completionRate: campaignMissions.length === 0 ? 0 : Math.round((completedMissions / campaignMissions.length) * 100),
    xpEarned: campaignMissions.filter((mission) => mission.status === "Completed").reduce((sum, mission) => sum + mission.xpReward, 0),
    overdueCount,
  };
}
