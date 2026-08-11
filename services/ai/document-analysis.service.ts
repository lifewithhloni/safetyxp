import type { PolicyDocumentMetadata, PolicyAnalysis } from "@/types/ai-content";

export function extractTextFromDocument(file: File | { name: string; type: string; content: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    if ((file as File).name && (file as File).type) {
      if ((file as File).type !== "application/pdf") {
        reject(new Error("Unsupported document type."));
        return;
      }
      resolve("Mock extracted text from policy document containing safety rules, emergency procedures, and compliance expectations.");
      return;
    }

    if ((file as any).content) {
      resolve((file as any).content);
      return;
    }

    reject(new Error("Text extraction failed."));
  });
}

export function analyzeDocumentStructure(document: PolicyDocumentMetadata, text: string): PolicyAnalysis {
  const lines = text.split(". ");
  const topics = ["Emergency response", "Hazard reporting", "Personal protective equipment"].slice(0, Math.min(3, lines.length));
  const estimatedReadingTimeMinutes = Math.max(5, Math.ceil(text.split(" ").length / 200));

  return {
    documentId: document.id,
    pagesAnalyzed: document.pages,
    topics,
    estimatedReadingTimeMinutes,
    majorSections: ["Introduction", "Risk controls", "Incident response"],
    sentiment: "Neutral",
    potentialAmbiguities: ["When should employees escalate a hazard?"],
    potentialSafetySensitiveStatements: ["Do not block emergency exits."],
    status: "AI_GENERATED",
  };
}

export function validateDocumentExtraction(text: string): boolean {
  return Boolean(text && text.trim().length > 20);
}
