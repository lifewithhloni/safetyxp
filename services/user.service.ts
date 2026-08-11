import type { ProfileData } from "@/types";

export function getUserProfile(): ProfileData {
  return {
    name: "Maya Chen",
    department: "Operations",
    manager: "Nadia Brooks",
    compliance: "Compliant",
    level: 12,
    achievements: ["Safety Champion", "Rapid Responder", "Streak 18 days"],
  };
}
