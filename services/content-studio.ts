import type { StudioContent } from "@/types/content-studio";

export const mockStudioContent: StudioContent = {
  summary: [
    "Employees will learn the core principles of fire safety, emergency evacuation, and incident escalation.",
    "Key takeaways focus on hazard reporting, PPE use, and clear communication during a live workplace incident.",
    "Important warnings emphasize never blocking emergency exits and always following site-specific response procedures.",
    "Safety tips highlight rapid reporting, calm response, and the distinction between individual actions and escalation steps.",
  ],
  lessons: [
    { id: "lesson-1", title: "Introduction", summary: "A short introduction to the fire safety policy and why it matters.", duration: "7 mins", category: "Foundation" },
    { id: "lesson-2", title: "Fire Prevention", summary: "Recognise common risks and prevent incidents before they escalate.", duration: "9 mins", category: "Prevention" },
    { id: "lesson-3", title: "Emergency Procedures", summary: "Understand what to do and who to inform during an emergency.", duration: "8 mins", category: "Response" },
  ],
  quiz: [
    {
      id: "q-1",
      question: "What is the first action when an emergency exit is blocked?",
      options: ["Leave it and continue working", "Report it immediately to your supervisor", "Move the obstruction yourself", "Take a photo and wait"],
      correctAnswer: "Report it immediately to your supervisor",
      difficulty: "Easy",
      xp: 100,
    },
    {
      id: "q-2",
      question: "Which PPE item is required in a hot work zone?",
      options: ["Hard hat", "Safety glasses", "Gloves", "All of the above"],
      correctAnswer: "All of the above",
      difficulty: "Medium",
      xp: 150,
    },
  ],
  scenarios: [
    {
      id: "scenario-1",
      title: "Blocked Exit During Shift Hand-off",
      description: "A pallet is obstructing the emergency exit during a busy hand-off period.",
      options: ["Ignore it and continue", "Move the pallet immediately", "Report it and alert the supervisor", "Leave a note for later"],
      correctResponse: "Report it and alert the supervisor",
      explanation: "The correct response is to protect people and escalate the hazard quickly.",
      outcome: "Employees learn to prioritise safety over convenience.",
    },
  ],
  flashcards: [
    { id: "flash-1", front: "When should you report a hazard?", back: "Immediately, even if it seems minor.", category: "Reporting", difficulty: "Easy" },
    { id: "flash-2", front: "What should you do during smoke detection?", back: "Alert others, follow procedures, and trigger the right response.", category: "Response", difficulty: "Medium" },
  ],
};
