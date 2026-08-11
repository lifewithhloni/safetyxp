export type StudioTab = "summary" | "lessons" | "quiz" | "scenarios" | "flashcards" | "certificate";

export interface LessonItem {
  id: string;
  title: string;
  summary: string;
  duration: string;
  category: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  xp: number;
}

export interface ScenarioItem {
  id: string;
  title: string;
  description: string;
  options: string[];
  correctResponse: string;
  explanation: string;
  outcome: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: string;
}

export interface StudioContent {
  summary: string[];
  lessons: LessonItem[];
  quiz: QuizQuestion[];
  scenarios: ScenarioItem[];
  flashcards: FlashcardItem[];
}
