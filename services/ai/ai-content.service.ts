import type {
  PolicyDocumentMetadata,
  PolicyAnalysis,
  PolicySummary,
  LearningModule,
  QuizQuestion,
  ScenarioChallenge,
  FlashcardItem,
  KeyRule,
  GeneratedContentPackage,
} from "@/types/ai-content";
import { getAIProvider } from "@/services/ai/ai-provider-factory";
import { validateGeneratedContent } from "@/services/ai/content-validation.service";
import { extractTextFromDocument, analyzeDocumentStructure, validateDocumentExtraction } from "@/services/ai/document-analysis.service";

function getProvider() {
  return getAIProvider();
}

export async function analyzePolicy(document: PolicyDocumentMetadata, file: File | { name: string; type: string; content: string }): Promise<{ analysis: PolicyAnalysis; text: string }> {
  const text = await extractTextFromDocument(file);
  if (!validateDocumentExtraction(text)) {
    throw new Error("Unable to extract policy content from the uploaded document.");
  }

  const aiResponse = await getProvider().analyzePolicy(document, text);
  const analysis = aiResponse.success ? aiResponse.data : analyzeDocumentStructure(document, text);
  return { analysis, text };
}

export async function generateSummary(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<PolicySummary> {
  const response = await getProvider().generateSummary(document, analysis, text);
  if (!response.success) {
    throw new Error(response.errors?.join(", ") ?? "Summary generation failed.");
  }
  return response.data;
}

export async function generateLearningObjectives(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<string[]> {
  const response = await getProvider().generateLearningObjectives(document, analysis, text);
  if (!response.success) {
    throw new Error(response.errors?.join(", ") ?? "Learning objective generation failed.");
  }
  return response.data;
}

export async function generateLessons(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<LearningModule[]> {
  const response = await getProvider().generateLessons(document, analysis, text);
  if (!response.success) {
    throw new Error(response.errors?.join(", ") ?? "Lesson generation failed.");
  }
  return response.data;
}

export async function generateQuizQuestions(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<QuizQuestion[]> {
  const response = await getProvider().generateQuiz(document, analysis, text);
  if (!response.success) {
    throw new Error(response.errors?.join(", ") ?? "Quiz generation failed.");
  }
  return response.data;
}

export async function generateScenarios(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<ScenarioChallenge[]> {
  const response = await getProvider().generateScenarios(document, analysis, text);
  if (!response.success) {
    throw new Error(response.errors?.join(", ") ?? "Scenario generation failed.");
  }
  return response.data;
}

export async function generateFlashcards(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<FlashcardItem[]> {
  const response = await getProvider().generateFlashcards(document, analysis, text);
  if (!response.success) {
    throw new Error(response.errors?.join(", ") ?? "Flashcard generation failed.");
  }
  return response.data;
}

export async function generateKeyRules(document: PolicyDocumentMetadata, analysis: PolicyAnalysis, text: string): Promise<KeyRule[]> {
  const response = await getProvider().generateKeyRules(document, analysis, text);
  if (!response.success) {
    throw new Error(response.errors?.join(", ") ?? "Key rule generation failed.");
  }
  return response.data;
}

export async function generateContentPackage(document: PolicyDocumentMetadata, file: File | { name: string; type: string; content: string }): Promise<GeneratedContentPackage> {
  const { analysis, text } = await analyzePolicy(document, file);
  const provider = getProvider();
  const summary = await generateSummary(document, analysis, text);
  const objectivesText = await generateLearningObjectives(document, analysis, text);
  const lessons = await generateLessons(document, analysis, text);
  const quizQuestions = await generateQuizQuestions(document, analysis, text);
  const scenarios = await generateScenarios(document, analysis, text);
  const flashcards = await generateFlashcards(document, analysis, text);
  const keyRules = await generateKeyRules(document, analysis, text);

  const grounding = await provider.validateContentGrounding(document, text, {
    analysis,
    summary,
    objectivesText,
    lessons,
    quizQuestions,
    scenarios,
    flashcards,
    keyRules,
  });

  const packageStatus = grounding.success && grounding.data.grounded && grounding.data.confidence >= 0.7
    ? "UNDER_REVIEW"
    : "NEEDS_REVIEW";

  const contentPackage: GeneratedContentPackage = {
    policyDocumentId: document.id,
    summary,
    objectives: objectivesText.map((text, index) => ({
      id: `objective-${index + 1}`,
      text,
      sourceDocumentId: document.id,
      status: "AI_GENERATED",
    })),
    lessons,
    quizQuestions,
    scenarios,
    flashcards,
    keyRules,
    warnings: grounding.success
      ? [...analysis.potentialAmbiguities, ...grounding.data.issues.map((issue) => issue.message)]
      : analysis.potentialAmbiguities,
    status: packageStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validation = validateGeneratedContent(contentPackage);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  return contentPackage;
}
