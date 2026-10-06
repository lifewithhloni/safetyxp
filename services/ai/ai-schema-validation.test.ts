import { describe, expect, it } from "@jest/globals";
import { aiGeneratedPayloadSchema } from "./ai-schemas";

describe("ai schema validation", () => {
  it("rejects malformed ai payloads", () => {
    expect(() => aiGeneratedPayloadSchema.parse({ bad: true })).toThrow();
  });

  it("requires source references for lessons and assessments", () => {
    const payload = {
      analysis: {
        title: "Fire Safety",
        summary: "Summary",
        topics: ["Topic"],
        learningObjectives: ["Objective"],
        keyRules: ["Rule"],
        riskAreas: [],
        importantWarnings: [],
        sections: ["Section 1"],
        ambiguities: [],
      },
      summary: {
        shortSummary: "Short summary",
        keyTakeaways: ["Takeaway"],
        importantWarnings: [],
      },
      learningObjectives: ["Objective"],
      lessons: [],
      quizQuestions: [],
      scenarios: [],
      flashcards: [],
      keyRules: [],
      grounding: {
        grounded: true,
        confidence: 0.8,
        issues: [],
        sourceReferences: [],
      },
    };

    expect(() => aiGeneratedPayloadSchema.parse(payload)).toThrow();
  });
});
