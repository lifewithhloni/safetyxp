import OpenAI from "openai";
import type { AIProvider, EmployeeRiskContext, RiskInsight } from "@/services/ai/ai-provider";
import type {
  AiProviderResponse,
  FlashcardItem,
  KeyRule,
  LearningModule,
  PolicyAnalysis,
  PolicyDocumentMetadata,
  PolicySummary,
  QuizQuestion,
  ScenarioChallenge,
} from "@/types/ai-content";
import {
  aiGeneratedPayloadSchema,
  policyAnalysisSchema,
  summarySchema,
  lessonSchema,
  quizQuestionSchema,
  scenarioSchema,
  flashcardSchema,
  contentGroundingResultSchema,
  riskInsightSchema,
  type ContentGroundingResult,
} from "@/services/ai/ai-schemas";
import { buildPolicyAnalysisPrompt } from "@/services/ai/prompts/policy-analysis.prompt";
import { buildSummaryPrompt } from "@/services/ai/prompts/summary.prompt";
import { buildLessonPrompt } from "@/services/ai/prompts/lesson.prompt";
import { buildQuizPrompt } from "@/services/ai/prompts/quiz.prompt";
import { buildScenarioPrompt } from "@/services/ai/prompts/scenario.prompt";
import { buildFlashcardPrompt } from "@/services/ai/prompts/flashcard.prompt";
import { buildGroundingPrompt } from "@/services/ai/prompts/grounding.prompt";
import { buildRiskInsightPrompt } from "@/services/ai/prompts/risk-analysis.prompt";

function safeJsonParse<T>(value: string): T {
  return JSON.parse(value) as T;
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || "gpt-4.1-mini") {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  private async requestJson(prompt: string) {
    const response = await this.client.responses.create({
      model: this.model,
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      throw new Error("OpenAI response was empty.");
    }

    return {
      payload: safeJsonParse<unknown>(outputText),
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }

  async analyzePolicy(document: PolicyDocumentMetadata, text: string): Promise<AiProviderResponse<PolicyAnalysis>> {
    try {
      const { payload } = await this.requestJson(buildPolicyAnalysisPrompt(document.name, text));
      const parsed = policyAnalysisSchema.parse(payload);

      return {
        success: true,
        data: {
          documentId: document.id,
          pagesAnalyzed: document.pages,
          topics: parsed.topics,
          estimatedReadingTimeMinutes: Math.max(5, Math.ceil(text.split(/\s+/).length / 220)),
          majorSections: parsed.sections,
          potentialAmbiguities: parsed.ambiguities,
          potentialSafetySensitiveStatements: parsed.importantWarnings,
          status: "AI_GENERATED",
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          documentId: document.id,
          pagesAnalyzed: 0,
          topics: [],
          estimatedReadingTimeMinutes: 0,
          majorSections: [],
          potentialAmbiguities: [],
          potentialSafetySensitiveStatements: [],
          status: "DRAFT",
        },
        errors: [error instanceof Error ? error.message : "Policy analysis failed."],
      };
    }
  }

  async generateSummary(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<PolicySummary>> {
    try {
      const { payload } = await this.requestJson(buildSummaryPrompt(document.name, text));
      const parsed = summarySchema.parse(payload);
      return {
        success: true,
        data: {
          id: `summary-${document.id}`,
          sourceDocumentId: document.id,
          title: `${document.name} summary`,
          summary: parsed.shortSummary,
          keyPoints: parsed.keyTakeaways,
          warnings: parsed.importantWarnings,
          status: "AI_GENERATED",
        },
      };
    } catch (error) {
      return { success: false, data: {} as PolicySummary, errors: [error instanceof Error ? error.message : "Summary generation failed."] };
    }
  }

  async generateLearningObjectives(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<string[]>> {
    return {
      success: true,
      data: analysis.topics.map((topic) => `Apply ${topic.toLowerCase()} requirements according to policy guidance.`),
    };
  }

  async generateLessons(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<LearningModule[]>> {
    try {
      const { payload } = await this.requestJson(buildLessonPrompt(document.name, text));
      const parsed = (Array.isArray(payload) ? payload : []).map((item) => lessonSchema.parse(item));
      return {
        success: true,
        data: parsed.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          estimatedMinutes: lesson.estimatedMinutes,
          objectives: lesson.learningObjectives,
          order: lesson.order,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: lesson.sourceReferences[0]?.sourceSection,
        })),
      };
    } catch (error) {
      return { success: false, data: [], errors: [error instanceof Error ? error.message : "Lesson generation failed."] };
    }
  }

  async generateQuiz(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<QuizQuestion[]>> {
    try {
      const { payload } = await this.requestJson(buildQuizPrompt(document.name, text));
      const parsed = (Array.isArray(payload) ? payload : []).map((item) => quizQuestionSchema.parse(item));

      return {
        success: true,
        data: parsed.map((question) => ({
          id: question.id,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          xpReward: question.xpReward,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: question.sourceReference.sourceSection,
        })),
      };
    } catch (error) {
      return { success: false, data: [], errors: [error instanceof Error ? error.message : "Quiz generation failed."] };
    }
  }

  async generateScenarios(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<ScenarioChallenge[]>> {
    try {
      const { payload } = await this.requestJson(buildScenarioPrompt(document.name, text));
      const parsed = (Array.isArray(payload) ? payload : []).map((item) => scenarioSchema.parse(item));
      return {
        success: true,
        data: parsed.map((scenario) => ({
          id: scenario.id,
          title: scenario.title,
          situation: scenario.situation,
          options: scenario.options,
          correctResponse: scenario.correctResponse,
          explanation: scenario.explanation,
          learningObjective: scenario.learningObjective,
          xpReward: scenario.xpReward,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: scenario.sourceReference.sourceSection,
        })),
      };
    } catch (error) {
      return { success: false, data: [], errors: [error instanceof Error ? error.message : "Scenario generation failed."] };
    }
  }

  async generateFlashcards(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<FlashcardItem[]>> {
    try {
      const { payload } = await this.requestJson(buildFlashcardPrompt(document.name, text));
      const parsed = (Array.isArray(payload) ? payload : []).map((item) => flashcardSchema.parse(item));
      return {
        success: true,
        data: parsed.map((card) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          category: card.category,
          difficulty: card.difficulty,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: card.sourceReference.sourceSection,
        })),
      };
    } catch (error) {
      return { success: false, data: [], errors: [error instanceof Error ? error.message : "Flashcard generation failed."] };
    }
  }

  async generateKeyRules(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<KeyRule[]>> {
    const fromAnalysis = analysis.potentialSafetySensitiveStatements.map((rule, index) => ({
      id: `rule-${index + 1}`,
      rule,
      category: "Safety",
      status: "AI_GENERATED" as const,
      sourceDocumentId: document.id,
      sourceSection: analysis.majorSections[0] ?? "Policy",
    }));

    return {
      success: true,
      data: fromAnalysis.length > 0 ? fromAnalysis : [{
        id: "rule-1",
        rule: "Follow policy procedures and report hazards immediately.",
        category: "Safety",
        status: "AI_GENERATED",
        sourceDocumentId: document.id,
        sourceSection: "Policy",
      }],
    };
  }

  async validateContentGrounding(document: PolicyDocumentMetadata, text: string, generatedPayload: unknown): Promise<AiProviderResponse<ContentGroundingResult>> {
    try {
      const generation = aiGeneratedPayloadSchema.parse(generatedPayload);
      const { payload } = await this.requestJson(buildGroundingPrompt(document.name, text, JSON.stringify(generation)));
      const parsed = contentGroundingResultSchema.parse(payload);
      return { success: true, data: parsed };
    } catch (error) {
      return {
        success: false,
        data: {
          grounded: false,
          confidence: 0,
          issues: [{ message: "Grounding validation failed.", severity: "error" }],
          sourceReferences: [],
        },
        errors: [error instanceof Error ? error.message : "Grounding validation failed."],
      };
    }
  }

  async generateRiskInsight(context: EmployeeRiskContext): Promise<AiProviderResponse<RiskInsight>> {
    try {
      const { payload } = await this.requestJson(buildRiskInsightPrompt(context));
      const parsed = riskInsightSchema.parse(payload);
      return { success: true, data: parsed };
    } catch (error) {
      return {
        success: false,
        data: { narrative: "", topRecommendation: "", urgencyReason: "", confidence: 0 },
        errors: [error instanceof Error ? error.message : "Risk insight generation failed."],
      };
    }
  }
}
