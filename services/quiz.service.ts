import type { QuizQuestion } from "@/types";

export function getQuizQuestion(): QuizQuestion {
  return {
    prompt: "What is the first action you should take when you notice a blocked emergency exit?",
    options: [
      {
        id: "a",
        label: "Leave it and continue your work",
        feedback: "That delays response and may put others at risk.",
        isCorrect: false,
      },
      {
        id: "b",
        label: "Report it to your supervisor immediately",
        feedback: "Correct. Prompt reporting keeps the team safe.",
        isCorrect: true,
      },
      {
        id: "c",
        label: "Move the obstruction yourself",
        feedback: "Only authorized personnel should handle blocking equipment.",
        isCorrect: false,
      },
      {
        id: "d",
        label: "Take a photo and wait for guidance",
        feedback: "Waiting can create unnecessary risk in a live safety issue.",
        isCorrect: false,
      },
    ],
  };
}
