import { describe, expect, it } from "@jest/globals";
import { validateGeneratedContent } from "@/services/ai/content-validation.service";
import type { GeneratedContentPackage } from "@/types/ai-content";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBase(): GeneratedContentPackage {
  return {
    policyDocumentId: "doc-001",
    summary: { id: "s1", sourceDocumentId: "doc-001", title: "T", summary: "Non-empty summary text.", keyPoints: ["Point A"], warnings: [], status: "UNDER_REVIEW" },
    objectives: [{ id: "o1", text: "Obj 1", sourceDocumentId: "doc-001", status: "UNDER_REVIEW" }],
    lessons: [
      { id: "l1", title: "Lesson 1", description: "Intro lesson.", estimatedMinutes: 8, objectives: ["Obj 1"], order: 1, status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 1", sourceExcerpt: "Emergency exits must remain clear at all times." },
      { id: "l2", title: "Lesson 2", description: "Follow-up lesson.", estimatedMinutes: 10, objectives: ["Obj 2"], order: 2, status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 2", sourceExcerpt: "Report hazards immediately." },
    ],
    quizQuestions: [
      { id: "q1", question: "What to do?", options: ["A", "B"], correctAnswer: "A", explanation: "A is correct.", difficulty: "Easy", xpReward: 50, status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 2", sourceExcerpt: "Report hazards immediately." },
      { id: "q2", question: "What else?", options: ["A", "B"], correctAnswer: "B", explanation: "B is correct.", difficulty: "Easy", xpReward: 50, status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 1", sourceExcerpt: "Emergency exits must remain clear at all times." },
    ],
    scenarios: [{
      id: "sc1", title: "Scenario 1", situation: "Fire alarm sounds.", options: ["Evacuate", "Stay"],
      correctResponse: "Evacuate", explanation: "Always evacuate.", learningObjective: "Safe evacuation.",
      xpReward: 100, status: "UNDER_REVIEW",
      sourceDocumentId: "doc-001", sourceSection: "Section 3", sourceExcerpt: "Follow evacuation routes.",
    }],
    flashcards: [
      { id: "f1", front: "What to report?", back: "All hazards.", category: "Safety", difficulty: "Easy", status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 4", sourceExcerpt: "Hazard reporting policy." },
      { id: "f2", front: "What to avoid?", back: "Blocking exits.", category: "Safety", difficulty: "Easy", status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 1", sourceExcerpt: "Emergency exits must remain clear at all times." },
    ],
    keyRules: [
      { id: "r1", rule: "Keep exits clear.", category: "Safety", status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 5", sourceExcerpt: "Emergency exits must never be blocked." },
      { id: "r2", rule: "Report hazards.", category: "Safety", status: "UNDER_REVIEW", sourceDocumentId: "doc-001", sourceSection: "Section 2", sourceExcerpt: "Report hazards immediately." },
    ],
    warnings: [],
    status: "UNDER_REVIEW",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// sourceExcerpt validation — lessons
// ---------------------------------------------------------------------------

describe("validateGeneratedContent — sourceExcerpt: lessons", () => {
  it("passes when sourceExcerpt is present and non-empty", () => {
    const result = validateGeneratedContent(makeBase());
    expect(result.valid).toBe(true);
  });

  it("fails when lesson sourceExcerpt is absent", () => {
    const content = makeBase();
    delete (content.lessons[0] as unknown as Record<string, unknown>).sourceExcerpt;
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Lesson 1") && e.includes("source traceability"))).toBe(true);
  });

  it("fails when lesson sourceExcerpt is whitespace only", () => {
    const content = makeBase();
    content.lessons[0].sourceExcerpt = "   ";
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Lesson 1"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sourceExcerpt validation — quiz questions
// ---------------------------------------------------------------------------

describe("validateGeneratedContent — sourceExcerpt: quiz questions", () => {
  it("fails when quiz question sourceExcerpt is absent", () => {
    const content = makeBase();
    delete (content.quizQuestions[0] as unknown as Record<string, unknown>).sourceExcerpt;
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Quiz question 1"))).toBe(true);
  });

  it("fails when quiz question sourceExcerpt is whitespace", () => {
    const content = makeBase();
    content.quizQuestions[0].sourceExcerpt = "  ";
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sourceExcerpt validation — scenarios
// ---------------------------------------------------------------------------

describe("validateGeneratedContent — sourceExcerpt: scenarios", () => {
  it("fails when scenario sourceExcerpt is absent", () => {
    const content = makeBase();
    delete (content.scenarios[0] as unknown as Record<string, unknown>).sourceExcerpt;
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Scenario 1"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sourceExcerpt validation — flashcards
// ---------------------------------------------------------------------------

describe("validateGeneratedContent — sourceExcerpt: flashcards", () => {
  it("fails when flashcard sourceExcerpt is absent", () => {
    const content = makeBase();
    delete (content.flashcards[0] as unknown as Record<string, unknown>).sourceExcerpt;
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Flashcard 1"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sourceExcerpt validation — key rules
// ---------------------------------------------------------------------------

describe("validateGeneratedContent — sourceExcerpt: key rules", () => {
  it("fails when key rule sourceExcerpt is absent", () => {
    const content = makeBase();
    delete (content.keyRules[0] as unknown as Record<string, unknown>).sourceExcerpt;
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Key rule 1"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sourceDocumentId — existing validation still enforced
// ---------------------------------------------------------------------------

describe("validateGeneratedContent — sourceDocumentId still required", () => {
  it("fails when sourceDocumentId is absent on a lesson", () => {
    const content = makeBase();
    (content.lessons[0] as unknown as Record<string, unknown>).sourceDocumentId = "";
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Lesson 1") && e.includes("source traceability"))).toBe(true);
  });

  it("fails when sourceSection is blank on a quiz question", () => {
    const content = makeBase();
    (content.quizQuestions[0] as unknown as Record<string, unknown>).sourceSection = "  ";
    const result = validateGeneratedContent(content);
    expect(result.valid).toBe(false);
  });
});
