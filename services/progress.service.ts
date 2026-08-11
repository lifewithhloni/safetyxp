import type { MissionData } from "@/types";

export function getMissionProgress(): MissionData {
  return {
    title: "Fire Safety",
    module: "Module 3",
    estimatedTime: "8 minutes",
    progress: 45,
    score: 82,
    certificatesCompleted: 4,
    certificatesTotal: 7,
    level: 12,
    xp: 2450,
    recentActivity: "Yesterday • Completed PPE Training",
  };
}
