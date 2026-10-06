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
import type { ContentGroundingResult } from "@/services/ai/ai-schemas";

export interface EmployeeRiskContext {
  employeeName: string;
  campaignName: string;
  currentProgress: number;
  daysRemaining: number;
  missedMissions: number;
  completionVelocity: number;
  riskScore: number;
  riskLevel: string;
}

export interface RiskInsight {
  narrative: string;
  topRecommendation: string;
  urgencyReason: string;
  confidence: number;
}

export interface AIProvider {
  analyzePolicy(document: PolicyDocumentMetadata, text: string): Promise<AiProviderResponse<PolicyAnalysis>>;
  generateSummary(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<PolicySummary>>;
  generateLearningObjectives(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<string[]>>;
  generateLessons(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<LearningModule[]>>;
  generateQuiz(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<QuizQuestion[]>>;
  generateScenarios(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<ScenarioChallenge[]>>;
  generateFlashcards(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<FlashcardItem[]>>;
  generateKeyRules(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<KeyRule[]>>;
  validateContentGrounding(document: PolicyDocumentMetadata, text: string, generatedPayload: unknown): Promise<AiProviderResponse<ContentGroundingResult>>;
  generateRiskInsight(context: EmployeeRiskContext): Promise<AiProviderResponse<RiskInsight>>;
}

export type AIProviderConfig = {
  provider: "mock" | "openai";
  apiKey?: string;
  model?: string;
};

export type { AiProviderResponse };
