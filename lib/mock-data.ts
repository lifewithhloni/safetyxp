export interface MissionData {
  title: string;
  module: string;
  estimatedTime: string;
  progress: number;
  score: number;
  certificatesCompleted: number;
  certificatesTotal: number;
  level: number;
  xp: number;
  recentActivity: string;
}

export interface LessonContent {
  title: string;
  summary: string;
  policy: string;
  objective: string;
}

export interface QuizOption {
  id: string;
  label: string;
  feedback: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  prompt: string;
  options: QuizOption[];
}

export interface ScenarioQuestion {
  title: string;
  prompt: string;
  description: string;
  options: QuizOption[];
}

export interface CertificateItem {
  title: string;
  status: string;
  issueDate: string;
  expiryDate: string;
}

export interface ProfileData {
  name: string;
  department: string;
  manager: string;
  compliance: string;
  level: number;
  achievements: string[];
}

export const missionData = {
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

export const lessonContent = {
  title: "Emergency Response Basics",
  summary:
    "Review the essential steps for escalating a safety incident, protecting nearby coworkers, and communicating clearly with the response team.",
  policy: "Employees must report hazards immediately, follow the posted evacuation path, and never improvise during a live incident.",
  objective: "Build confidence in the first 60 seconds of a workplace emergency.",
};

export const quizQuestion = {
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

export const scenarioQuestion = {
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

export const certificates = [
  {
    title: "PPE Awareness",
    status: "Valid",
    issueDate: "Jan 12, 2026",
    expiryDate: "Jan 12, 2027",
  },
  {
    title: "Incident Response",
    status: "Valid",
    issueDate: "Feb 3, 2026",
    expiryDate: "Feb 3, 2027",
  },
  {
    title: "Chemical Handling",
    status: "Pending Review",
    issueDate: "Mar 17, 2026",
    expiryDate: "Mar 17, 2027",
  },
  {
    title: "Workplace Ergonomics",
    status: "Valid",
    issueDate: "Apr 8, 2026",
    expiryDate: "Apr 8, 2027",
  },
];

export const profileData = {
  name: "Maya Chen",
  department: "Operations",
  manager: "Nadia Brooks",
  compliance: "Compliant",
  level: 12,
  achievements: ["Safety Champion", "Rapid Responder", "Streak 18 days"],
};
