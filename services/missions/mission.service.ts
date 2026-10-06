export type MissionStatus = "scheduled" | "in_progress" | "completed" | "missed" | "overdue";

export type MissionRecord = {
  id: string;
  employeeId: string;
  campaignId: string;
  moduleId: string;
  title: string;
  scheduledDate: string;
  type: "lesson" | "quiz" | "scenario" | "flashcards" | "review" | "finalAssessment";
  status: MissionStatus;
  estimatedMinutes: number;
  orderIndex: number;
  xpReward: number;
  startedAt?: string | null;
  completedAt?: string | null;
};

export function createMissionSchedule({
  campaignId,
  employeeId,
  learningDeadline,
  modules,
  startDate,
}: {
  campaignId: string;
  employeeId: string;
  learningDeadline: string;
  modules: Array<{ id: string; title: string; estimatedMinutes: number; orderIndex: number }>
  startDate: string;
}) {
  return modules.map((module, index) => ({
    id: `mission-${campaignId}-${employeeId}-${module.id}`,
    employeeId,
    campaignId,
    moduleId: module.id,
    title: module.title,
    scheduledDate: index === 0 ? startDate : new Date(new Date(startDate).getTime() + index * 86400000).toISOString().split("T")[0],
    type: index % 2 === 0 ? "lesson" : "quiz",
    status: "scheduled" as const,
    estimatedMinutes: module.estimatedMinutes,
    orderIndex: module.orderIndex,
    xpReward: Math.max(10, module.estimatedMinutes * 2),
    startedAt: null,
    completedAt: null,
  }));
}

export function getTodaysMission({
  employeeId,
  date,
  schedule,
}: {
  employeeId: string;
  date: string;
  schedule: MissionRecord[];
}) {
  return schedule.find((mission) => mission.employeeId === employeeId && mission.scheduledDate === date) ?? null;
}

export function ensureMissionCompletion({
  missionId,
  employeeId,
  status,
  xpAwarded,
}: {
  missionId: string;
  employeeId: string;
  status: MissionStatus;
  xpAwarded: number;
}) {
  return {
    id: missionId,
    employeeId,
    status,
    xpAwarded,
    completedAt: new Date().toISOString(),
  };
}
