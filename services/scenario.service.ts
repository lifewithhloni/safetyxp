import type { ScenarioQuestion } from "@/types";

export function getScenarioQuestion(): ScenarioQuestion {
  return {
    title: "Workplace incident",
    prompt: "Smoke is coming from an electrical panel. What should you do?",
    description: "The safest response is to protect people first and escalate the hazard quickly.",
    options: [
      {
        id: "s1",
        label: "Use water to cool the panel",
        feedback: "Water can worsen electrical hazards.",
        isCorrect: false,
      },
      {
        id: "s2",
        label: "Alert nearby staff and pull the alarm",
        feedback: "Correct. You protect people and trigger the right response.",
        isCorrect: true,
      },
      {
        id: "s3",
        label: "Open the panel to inspect it",
        feedback: "Do not interact with damaged electrical equipment directly.",
        isCorrect: false,
      },
      {
        id: "s4",
        label: "Wait for someone else to act",
        feedback: "Delayed action increases exposure and risk.",
        isCorrect: false,
      },
    ],
  };
}
