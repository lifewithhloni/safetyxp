import type { PolicyDocumentMetadata, GeneratedContentPackage, ContentStatus } from "@/types/ai-content";

const storedDocuments: PolicyDocumentMetadata[] = [];
const storedContentPackages: GeneratedContentPackage[] = [];

export function savePolicyDocument(document: PolicyDocumentMetadata) {
  storedDocuments.push(document);
  return document;
}

export function getPolicyDocument(documentId: string): PolicyDocumentMetadata | undefined {
  return storedDocuments.find((item) => item.id === documentId);
}

export function saveGeneratedContent(content: GeneratedContentPackage) {
  storedContentPackages.push(content);
  return content;
}

export function getGeneratedContent(policyDocumentId: string): GeneratedContentPackage | undefined {
  return storedContentPackages.find((item) => item.policyDocumentId === policyDocumentId);
}

export function updateContentStatus(policyDocumentId: string, status: ContentStatus): GeneratedContentPackage | undefined {
  const content = getGeneratedContent(policyDocumentId);
  if (!content) return undefined;
  content.status = status;
  content.summary.status = status;
  content.lessons.forEach((lesson) => (lesson.status = status));
  content.quizQuestions.forEach((question) => (question.status = status));
  content.scenarios.forEach((scenario) => (scenario.status = status));
  content.flashcards.forEach((flashcard) => (flashcard.status = status));
  content.keyRules.forEach((rule) => (rule.status = status));
  return content;
}
