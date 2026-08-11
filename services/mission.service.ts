import type { DailyMission } from "@/types/scheduling";
import { getTodaysMission as fetchTodaysMission, completeMission as markMissionComplete } from "@/services/scheduling.service";

export function getTodaysMission(employeeId: string): DailyMission | null {
  return fetchTodaysMission(employeeId);
}

export function completeMission(missionId: string): DailyMission | undefined {
  return markMissionComplete(missionId);
}
