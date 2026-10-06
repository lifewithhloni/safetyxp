import { z } from "zod";

export const PROMPT_VERSION = "1.0";

export const sourceReferenceSchema = z.object({
  sourceDocumentId: z.string().min(1),
  sourceSection: z.string().min(1),
  sourcePage: z.number().int().nonnegative().nullable().optional(),
  sourceExcerpt: z.string().min(1),
  sourceReference: z.string().min(1),
});

export const policyAnalysisSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  topics: z.array(z.string().min(1)).min(1),
  learningObjectives: z.array(z.string().min(1)).min(1),
  keyRules: z.array(z.string().min(1)).min(1),
  riskAreas: z.array(z.string().min(1)).default([]),
  importantWarnings: z.array(z.string().min(1)).default([]),
  sections: z.array(z.string().min(1)).default([]),
  ambiguities: z.array(z.string().min(1)).default([]),
});

export const summarySchema = z.object({
  shortSummary: z.string().min(1),
  keyTakeaways: z.array(z.string().min(1)).min(1),
  importantWarnings: z.array(z.string().min(1)).default([]),
});

export const lessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  content: z.string().min(1),
  estimatedMinutes: z.number().int().min(5).max(15),
  learningObjectives: z.array(z.string().min(1)).min(1),
  order: z.number().int().min(1),
  sourceReferences: z.array(sourceReferenceSchema).min(1),
  status: z.enum(["AI_GENERATED", "VALIDATING", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "NEEDS_REVIEW"]),
});

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  xpReward: z.number().int().min(1).max(100),
  sourceReference: sourceReferenceSchema,
  status: z.enum(["AI_GENERATED", "VALIDATING", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "NEEDS_REVIEW"]),
});

export const scenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  situation: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctResponse: z.string().min(1),
  explanation: z.string().min(1),
  learningObjective: z.string().min(1),
  sourceReference: sourceReferenceSchema,
  xpReward: z.number().int().min(1).max(200),
  status: z.enum(["AI_GENERATED", "VALIDATING", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "NEEDS_REVIEW"]),
});

export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  category: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  sourceReference: sourceReferenceSchema,
  status: z.enum(["AI_GENERATED", "VALIDATING", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "NEEDS_REVIEW"]),
});

export const keyRuleSchema = z.object({
  id: z.string().min(1),
  rule: z.string().min(1),
  category: z.string().min(1),
  sourceReference: sourceReferenceSchema,
  status: z.enum(["AI_GENERATED", "VALIDATING", "UNDER_REVIEW", "APPROVED", "PUBLISHED", "NEEDS_REVIEW"]),
});

export const groundingIssueSchema = z.object({
  message: z.string().min(1),
  severity: z.enum(["warning", "error"]),
});

export const contentGroundingResultSchema = z.object({
  grounded: z.boolean(),
  confidence: z.number().min(0).max(1),
  issues: z.array(groundingIssueSchema),
  sourceReferences: z.array(sourceReferenceSchema),
});

export const aiGeneratedPayloadSchema = z.object({
  analysis: policyAnalysisSchema,
  summary: summarySchema,
  learningObjectives: z.array(z.string().min(1)).min(1),
  lessons: z.array(lessonSchema).min(1),
  quizQuestions: z.array(quizQuestionSchema).min(1),
  scenarios: z.array(scenarioSchema).min(1),
  flashcards: z.array(flashcardSchema).min(1),
  keyRules: z.array(keyRuleSchema).min(1),
  grounding: contentGroundingResultSchema,
});

export type PolicyAnalysisV2 = z.infer<typeof policyAnalysisSchema>;
export type AiGeneratedPayload = z.infer<typeof aiGeneratedPayloadSchema>;
export type ContentGroundingResult = z.infer<typeof contentGroundingResultSchema>;

export const riskInsightSchema = z.object({
  narrative: z.string().min(1),
  topRecommendation: z.string().min(1),
  urgencyReason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type RiskInsightValidated = z.infer<typeof riskInsightSchema>;
