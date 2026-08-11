import { analyzePolicy, generateContentPackage } from "@/services/ai/ai-content.service";
import type { PolicyDocumentMetadata } from "@/types/ai-content";

describe("AI content generation pipeline", () => {
  const mockDocument: PolicyDocumentMetadata = {
    id: "doc-001",
    name: "Fire Safety Policy.pdf",
    type: "pdf",
    size: 1240000,
    uploadedAt: "2026-08-11T00:00:00.000Z",
    pages: 8,
    source: "mock-upload",
    status: "DRAFT",
  };

  const mockFile = {
    name: "Fire Safety Policy.pdf",
    type: "application/pdf",
    content: "This policy contains emergency procedures, hazard reporting requirements, and compliance guidelines.",
  };

  it("analyzes a policy document successfully", async () => {
    const result = await analyzePolicy(mockDocument, mockFile);
    expect(result.analysis.documentId).toBe(mockDocument.id);
    expect(result.analysis.topics.length).toBeGreaterThan(0);
    expect(result.analysis.estimatedReadingTimeMinutes).toBeGreaterThan(0);
  });

  it("generates a valid content package", async () => {
    const packageResult = await generateContentPackage(mockDocument, mockFile);
    expect(packageResult.policyDocumentId).toBe(mockDocument.id);
    expect(packageResult.summary.status).toBe("AI_GENERATED");
    expect(packageResult.lessons.length).toBeGreaterThan(0);
    expect(packageResult.quizQuestions.every((question) => question.options.includes(question.correctAnswer))).toBe(true);
    expect(packageResult.status).toBe("AI_GENERATED");
  });
});
