import type {
  PolicySummary,
  LearningModule,
  QuizQuestion,
  ScenarioChallenge,
  FlashcardItem,
  KeyRule,
  AiProviderResponse,
  PolicyDocumentMetadata,
  PolicyAnalysis,
} from "@/types/ai-content";

export interface AIProvider {
  generateSummary(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<PolicySummary>>;
  generateLearningObjectives(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<string[]>>;
  generateLessons(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<LearningModule[]>>;
  generateQuiz(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<QuizQuestion[]>>;
  generateScenarios(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<ScenarioChallenge[]>>;
  generateFlashcards(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<FlashcardItem[]>>;
  generateKeyRules(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<KeyRule[]>>;
}

export type AIProviderConfig = {
  provider: "mock" | "openai";
  apiKey?: string;
};

export type { AiProviderResponse };
