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
