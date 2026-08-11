import type { LessonContent } from "@/types";

export function getLessonContent(): LessonContent {
  return {
    title: "Emergency Response Basics",
    summary:
      "Review the essential steps for escalating a safety incident, protecting nearby coworkers, and communicating clearly with the response team.",
    policy: "Employees must report hazards immediately, follow the posted evacuation path, and never improvise during a live incident.",
    objective: "Build confidence in the first 60 seconds of a workplace emergency.",
  };
}
