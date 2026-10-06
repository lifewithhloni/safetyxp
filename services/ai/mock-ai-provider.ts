import type { AIProvider, EmployeeRiskContext, RiskInsight } from "@/services/ai/ai-provider";
import type { ContentGroundingResult } from "@/services/ai/ai-schemas";
import type { AiProviderResponse } from "@/types/ai-content";
import type {
  PolicyDocumentMetadata,
  PolicyAnalysis,
  PolicySummary,
  LearningModule,
  QuizQuestion,
  ScenarioChallenge,
  FlashcardItem,
  KeyRule,
} from "@/types/ai-content";

function createBaseId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export class MockAIProvider implements AIProvider {
  async analyzePolicy(document: PolicyDocumentMetadata, text: string): Promise<AiProviderResponse<PolicyAnalysis>> {
    return {
      success: true,
      data: {
        documentId: document.id,
        pagesAnalyzed: document.pages,
        topics: ["Emergency response", "Hazard reporting", "PPE"],
        estimatedReadingTimeMinutes: Math.max(5, Math.ceil(text.split(/\s+/).length / 220)),
        majorSections: ["Overview", "Procedures", "Escalation"],
        sentiment: "Neutral",
        potentialAmbiguities: ["Clarify escalation threshold for repeated hazards."],
        potentialSafetySensitiveStatements: ["Never block emergency exits."],
        status: "AI_GENERATED",
      },
    };
  }

  async generateSummary(document: PolicyDocumentMetadata, _analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<PolicySummary>> {
    return {
      success: true,
      data: {
        id: createBaseId("summary"),
        sourceDocumentId: document.id,
        title: `${document.name.replace(/\.[^.]+$/, "")} summary`,
        summary: `A structured summary of the ${document.name} for training purposes. The policy focuses on safety compliance, hazard prevention, and emergency response awareness.`,
        keyPoints: [
          "Employees must follow site-specific emergency procedures.",
          "Report hazards immediately and keep exits clear.",
          "Use PPE and attend all required drills.",
        ],
        warnings: [
          "Failure to follow the policy can result in safety incidents.",
          "Do not bypass emergency equipment or alarms.",
        ],
        status: "AI_GENERATED",
      },
    };
  }

  async generateLearningObjectives(document: PolicyDocumentMetadata, _analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<string[]>> {
    return {
      success: true,
      data: [
        "Explain the core safety requirements in the policy.",
        "Identify workplace hazards and appropriate reporting steps.",
        "Describe correct emergency response behaviours.",
      ],
    };
  }

  async generateLessons(document: PolicyDocumentMetadata, _analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<LearningModule[]>> {
    return {
      success: true,
      data: [
        {
          id: createBaseId("lesson"),
          title: "Policy overview and purpose",
          description: "Introduce the safety policy and explain why it exists.",
          estimatedMinutes: 8,
          objectives: ["Define the policy scope", "Recognise why compliance matters"],
          order: 1,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 1",
          sourceExcerpt: "Employees must follow site-specific emergency procedures and safety protocols.",
        },
        {
          id: createBaseId("lesson"),
          title: "Hazard identification and reporting",
          description: "Review how to identify common hazards and report them correctly.",
          estimatedMinutes: 10,
          objectives: ["Identify hazards", "Report issues quickly"],
          order: 2,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 2",
          sourceExcerpt: "Report all safety hazards immediately upon identification.",
        },
      ],
    };
  }

  async generateQuiz(document: PolicyDocumentMetadata, _analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<QuizQuestion[]>> {
    return {
      success: true,
      data: [
        {
          id: createBaseId("quiz"),
          question: "What should you do if you find a blocked emergency exit?",
          options: ["Ignore it", "Report it immediately", "Wait until end of shift", "Move it yourself"],
          correctAnswer: "Report it immediately",
          explanation: "Blocked exits must be reported immediately so they can be cleared safely.",
          difficulty: "Easy",
          xpReward: 120,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 4.2",
          sourceExcerpt: "Blocked exits must be reported immediately so they can be cleared safely.",
        },
        {
          id: createBaseId("quiz"),
          question: "Which action is required before starting hot work?",
          options: ["Check PPE", "Notify supervisor", "Confirm permit", "All of the above"],
          correctAnswer: "All of the above",
          explanation: "Hot work requires PPE, supervisor awareness, and an approved permit.",
          difficulty: "Medium",
          xpReward: 140,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 5.1",
          sourceExcerpt: "Hot work requires a permit, supervisor approval, and appropriate PPE.",
        },
      ],
    };
  }

  async generateScenarios(document: PolicyDocumentMetadata, _analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<ScenarioChallenge[]>> {
    return {
      success: true,
      data: [
        {
          id: createBaseId("scenario"),
          title: "Emergency exit blocked during a shift",
          situation: "A pallet is blocking the emergency exit during handover with several people nearby.",
          options: ["Ignore it", "Move it immediately", "Report and alert supervisor", "Wait for end of shift"],
          correctResponse: "Report and alert supervisor",
          explanation: "The correct choice protects people and brings the issue to a responsible authority.",
          learningObjective: "Respond safely to blocked exits.",
          xpReward: 180,
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 4.2",
          sourceExcerpt: "Emergency exits must never be blocked and must remain accessible at all times.",
        },
      ],
    };
  }

  async generateFlashcards(document: PolicyDocumentMetadata, _analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<FlashcardItem[]>> {
    return {
      success: true,
      data: [
        {
          id: createBaseId("flashcard"),
          front: "When do you need to report a hazard?",
          back: "Immediately, as soon as it is identified.",
          category: "Reporting",
          difficulty: "Easy",
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 2",
          sourceExcerpt: "Report hazards immediately as soon as they are identified.",
        },
        {
          id: createBaseId("flashcard"),
          front: "What should you never do with emergency equipment?",
          back: "Do not bypass, disable, or block emergency equipment.",
          category: "Emergency Response",
          difficulty: "Medium",
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 4",
          sourceExcerpt: "Never bypass, disable, or interfere with emergency equipment or alarms.",
        },
      ],
    };
  }

  async generateKeyRules(document: PolicyDocumentMetadata, _analysis: PolicyAnalysis, _text: string): Promise<AiProviderResponse<KeyRule[]>> {
    return {
      success: true,
      data: [
        {
          id: createBaseId("rule"),
          rule: "Report all safety hazards immediately.",
          category: "Reporting",
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 2",
          sourceExcerpt: "Report all safety hazards to your supervisor immediately upon identification.",
        },
        {
          id: createBaseId("rule"),
          rule: "Keep emergency exits clear at all times.",
          category: "Emergency Response",
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 4.2",
          sourceExcerpt: "Emergency exits must remain unobstructed and accessible at all times.",
        },
      ],
    };
  }

  async validateContentGrounding(document: PolicyDocumentMetadata, text: string, _generatedPayload: unknown): Promise<AiProviderResponse<ContentGroundingResult>> {
    return {
      success: true,
      data: {
        grounded: true,
        confidence: 0.82,
        issues: analysisIssuesFromText(text),
        sourceReferences: [
          {
            sourceDocumentId: document.id,
            sourceSection: "Section 1",
            sourcePage: 1,
            sourceExcerpt: text.slice(0, 180),
            sourceReference: `${document.name} Section 1`,
          },
        ],
      },
    };
  }

  async generateRiskInsight(context: EmployeeRiskContext): Promise<AiProviderResponse<RiskInsight>> {
    const level = context.riskLevel.toLowerCase();
    return {
      success: true,
      data: {
        narrative: `${context.employeeName} has completed ${context.currentProgress}% of ${context.campaignName} with ${context.daysRemaining} days remaining and ${context.missedMissions} missed mission(s), resulting in a ${level} risk classification.`,
        topRecommendation: context.riskLevel === "CRITICAL"
          ? `Escalate immediately to ${context.employeeName}'s manager and assign a dedicated catch-up session today.`
          : `Send a personalised reminder to ${context.employeeName} and monitor progress over the next 24 hours.`,
        urgencyReason: `At the current pace, ${context.employeeName} is unlikely to complete ${context.campaignName} before the deadline, risking a compliance gap.`,
        confidence: 0.78,
      },
    };
  }
}

function analysisIssuesFromText(text: string) {
  if (text.toLowerCase().includes("may")) {
    return [{ message: "Ambiguous language detected in source policy.", severity: "warning" as const }];
  }

  return [];
}
