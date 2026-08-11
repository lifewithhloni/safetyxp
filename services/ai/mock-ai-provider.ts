import type { AIProvider } from "@/services/ai/ai-provider";
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
  async generateSummary(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<PolicySummary>> {
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

  async generateLearningObjectives(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<string[]>> {
    return {
      success: true,
      data: [
        "Explain the core safety requirements in the policy.",
        "Identify workplace hazards and appropriate reporting steps.",
        "Describe correct emergency response behaviours.",
      ],
    };
  }

  async generateLessons(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<LearningModule[]>> {
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
        },
      ],
    };
  }

  async generateQuiz(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<QuizQuestion[]>> {
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
        },
      ],
    };
  }

  async generateScenarios(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<ScenarioChallenge[]>> {
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
        },
      ],
    };
  }

  async generateFlashcards(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<FlashcardItem[]>> {
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
        },
      ],
    };
  }

  async generateKeyRules(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<AiProviderResponse<KeyRule[]>> {
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
        },
        {
          id: createBaseId("rule"),
          rule: "Keep emergency exits clear at all times.",
          category: "Emergency Response",
          status: "AI_GENERATED",
          sourceDocumentId: document.id,
          sourceSection: "Section 4.2",
        },
      ],
    };
  }
}
