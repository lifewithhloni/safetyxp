export type ContentStatus = "DRAFT" | "AI_GENERATED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PUBLISHED";

export interface PolicyDocumentMetadata {
  id: string;
  name: string;
  type: "pdf" | "docx" | "pptx";
  size: number;
  uploadedAt: string;
  pages: number;
  source: string;
  status: ContentStatus;
}

export interface PolicyAnalysis {
  documentId: string;
  pagesAnalyzed: number;
  topics: string[];
  estimatedReadingTimeMinutes: number;
  majorSections: string[];
  sentiment?: string;
  potentialAmbiguities: string[];
  potentialSafetySensitiveStatements: string[];
  status: ContentStatus;
}

export interface PolicySummary {
  id: string;
  sourceDocumentId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  warnings: string[];
  status: ContentStatus;
  sourceSection?: string;
}

export interface LearningObjective {
  id: string;
  text: string;
  sourceDocumentId: string;
  sourceSection?: string;
  status: ContentStatus;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  objectives: string[];
  order: number;
  status: ContentStatus;
  sourceDocumentId: string;
  sourceSection?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
  xpReward: number;
  status: ContentStatus;
  sourceDocumentId: string;
  sourceSection?: string;
}

export interface ScenarioChallenge {
  id: string;
  title: string;
  situation: string;
  options: string[];
  correctResponse: string;
  explanation: string;
  learningObjective: string;
  xpReward: number;
  status: ContentStatus;
  sourceDocumentId: string;
  sourceSection?: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: ContentStatus;
  sourceDocumentId: string;
  sourceSection?: string;
}

export interface KeyRule {
  id: string;
  rule: string;
  category: string;
  status: ContentStatus;
  sourceDocumentId: string;
  sourceSection?: string;
}

export interface GeneratedContentPackage {
  policyDocumentId: string;
  summary: PolicySummary;
  objectives: LearningObjective[];
  lessons: LearningModule[];
  quizQuestions: QuizQuestion[];
  scenarios: ScenarioChallenge[];
  flashcards: FlashcardItem[];
  keyRules: KeyRule[];
  warnings: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AiProviderResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}
