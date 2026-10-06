import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportServerError } from "@/lib/security/sentry-server";
import { getAIProvider } from "@/services/ai/ai-provider-factory";
import { validateGeneratedContent, validateSourceExcerpts } from "@/services/ai/content-validation.service";
import { aiGeneratedPayloadSchema } from "@/services/ai/ai-schemas";
import { estimateAiCost, recordAiUsage } from "@/services/ai/ai-usage.service";

// gpt-4.1-mini supports 128k tokens; 80,000 chars (≈20k tokens) is a conservative budget.
export const SOURCE_TEXT_CHAR_BUDGET = 80_000;
const OMISSION_MARKER = "\n\n[... content omitted for length ...]\n\n";

/**
 * Clips oversized policy text to stay within the model's practical input budget.
 * Keeps the first and last third of the document so structural context is preserved.
 */
export function budgetSourceText(text: string, budget = SOURCE_TEXT_CHAR_BUDGET): string {
  if (text.length <= budget) return text;
  const keepEach = Math.floor((budget - OMISSION_MARKER.length) / 2);
  return text.slice(0, keepEach) + OMISSION_MARKER + text.slice(text.length - keepEach);
}

export type AiJobStatus =
  | "QUEUED"
  | "ANALYZING"
  | "GENERATING"
  | "VALIDATING"
  | "READY_FOR_REVIEW"
  | "FAILED"
  | "APPROVED"
  | "PUBLISHED";

async function updateJobStatus(jobId: string, status: AiJobStatus, message?: string) {
  await supabaseAdmin
    .from("ai_generation_jobs")
    .update({ status, last_message: message ?? null, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

async function createGeneratedContentRows(input: {
  companyId: string;
  policyId: string;
  campaignId?: string | null;
  sourceDocumentId: string;
  createdBy: string;
  payload: unknown;
}) {
  const parsed = aiGeneratedPayloadSchema.parse(input.payload);

  const rows = [
    { content_type: "summary", content: parsed.summary },
    { content_type: "analysis", content: parsed.analysis },
    { content_type: "learning_objectives", content: parsed.learningObjectives },
    { content_type: "lessons", content: parsed.lessons },
    { content_type: "quiz_questions", content: parsed.quizQuestions },
    { content_type: "scenarios", content: parsed.scenarios },
    { content_type: "flashcards", content: parsed.flashcards },
    { content_type: "key_rules", content: parsed.keyRules },
    { content_type: "grounding", content: parsed.grounding },
  ].map((entry) => ({
    company_id: input.companyId,
    policy_id: input.policyId,
    campaign_id: input.campaignId ?? null,
    content_type: entry.content_type,
    content: {
      version: 1,
      generated_at: new Date().toISOString(),
      prompt_version: "1.0",
      data: entry.content,
    },
    status: "UNDER_REVIEW",
    source_document_id: input.sourceDocumentId,
    created_by: input.createdBy,
  }));

  const { error } = await supabaseAdmin.from("generated_content").insert(rows);
  if (error) {
    throw new Error(`Failed to persist generated content: ${error.message}`);
  }
}

async function logAudit(companyId: string, userId: string, action: string, entityId: string, metadata: Record<string, unknown>) {
  await supabaseAdmin.from("audit_logs").insert({
    company_id: companyId,
    user_id: userId,
    action,
    entity_type: "ai_generation",
    entity_id: entityId,
    metadata,
  });
}

export async function createAiGenerationJob(input: {
  companyId: string;
  policyId: string;
  policyDocumentId: string;
  createdBy: string;
  sourceText: string;
  policyTitle: string;
  campaignId?: string;
}) {
  const { data: existingJob } = await supabaseAdmin
    .from("ai_generation_jobs")
    .select("id, status, created_at")
    .eq("company_id", input.companyId)
    .eq("policy_id", input.policyId)
    .eq("policy_document_id", input.policyDocumentId)
    .in("status", ["QUEUED", "ANALYZING", "GENERATING", "VALIDATING", "READY_FOR_REVIEW"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingJob?.id) {
    return { jobId: existingJob.id };
  }

  const jobId = randomUUID();
  const { error } = await supabaseAdmin.from("ai_generation_jobs").insert({
    id: jobId,
    company_id: input.companyId,
    policy_id: input.policyId,
    policy_document_id: input.policyDocumentId,
    campaign_id: input.campaignId ?? null,
    created_by: input.createdBy,
    status: "QUEUED",
    last_message: "Queued for generation.",
  });

  if (error) {
    throw new Error(`Failed to create AI generation job: ${error.message}`);
  }

  await logAudit(input.companyId, input.createdBy, "AI Generation Started", jobId, {
    policyId: input.policyId,
    policyDocumentId: input.policyDocumentId,
  });

  return { jobId };
}

export async function processAiGenerationJob(input: {
  jobId: string;
  companyId: string;
  policyId: string;
  policyDocumentId: string;
  createdBy: string;
  sourceText: string;
  policyTitle: string;
  campaignId?: string;
}) {
  let providerName = "unknown";

  try {
    const provider = getAIProvider();
    providerName = provider.constructor.name === "OpenAIProvider" ? "openai" : "mock";
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const safeText = budgetSourceText(input.sourceText);

    await updateJobStatus(input.jobId, "ANALYZING", "Analyzing policy...");
    const metadata = {
      id: input.policyDocumentId,
      name: input.policyTitle,
      type: "pdf" as const,
      size: safeText.length,
      uploadedAt: new Date().toISOString(),
      pages: 1,
      source: "policy_documents",
      status: "AI_GENERATED" as const,
    };

    const analysisResponse = await provider.analyzePolicy(metadata, safeText);
    if (!analysisResponse.success) {
      throw new Error(analysisResponse.errors?.join("; ") || "Policy analysis failed.");
    }

    await updateJobStatus(input.jobId, "GENERATING", "Generating lessons and assessments...");

    const summaryResponse = await provider.generateSummary(metadata, analysisResponse.data, safeText);
    const objectivesResponse = await provider.generateLearningObjectives(metadata, analysisResponse.data, safeText);
    const lessonsResponse = await provider.generateLessons(metadata, analysisResponse.data, safeText);
    const quizResponse = await provider.generateQuiz(metadata, analysisResponse.data, safeText);
    const scenariosResponse = await provider.generateScenarios(metadata, analysisResponse.data, safeText);
    const flashcardsResponse = await provider.generateFlashcards(metadata, analysisResponse.data, safeText);
    const keyRulesResponse = await provider.generateKeyRules(metadata, analysisResponse.data, safeText);

    if (!summaryResponse.success || !objectivesResponse.success || !lessonsResponse.success || !quizResponse.success || !scenariosResponse.success || !flashcardsResponse.success || !keyRulesResponse.success) {
      throw new Error("One or more AI generation steps failed.");
    }

    const generatedPayload = {
      analysis: {
        title: input.policyTitle,
        summary: summaryResponse.data.summary,
        topics: analysisResponse.data.topics,
        learningObjectives: objectivesResponse.data,
        keyRules: keyRulesResponse.data.map((item) => item.rule),
        riskAreas: analysisResponse.data.potentialSafetySensitiveStatements,
        importantWarnings: summaryResponse.data.warnings,
        sections: analysisResponse.data.majorSections,
        ambiguities: analysisResponse.data.potentialAmbiguities,
      },
      summary: {
        shortSummary: summaryResponse.data.summary,
        keyTakeaways: summaryResponse.data.keyPoints,
        importantWarnings: summaryResponse.data.warnings,
      },
      learningObjectives: objectivesResponse.data,
      lessons: lessonsResponse.data.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        content: lesson.description,
        estimatedMinutes: lesson.estimatedMinutes,
        learningObjectives: lesson.objectives,
        order: lesson.order,
        sourceReferences: [{
          sourceDocumentId: input.policyDocumentId,
          sourceSection: lesson.sourceSection || "Policy",
          sourcePage: null,
          sourceExcerpt: lesson.description,
          sourceReference: `${input.policyTitle} - ${lesson.sourceSection || "Policy"}`,
        }],
        status: "AI_GENERATED",
      })),
      quizQuestions: quizResponse.data.map((item) => ({
        id: item.id,
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        difficulty: item.difficulty,
        xpReward: item.xpReward,
        sourceReference: {
          sourceDocumentId: input.policyDocumentId,
          sourceSection: item.sourceSection || "Policy",
          sourcePage: null,
          sourceExcerpt: item.explanation,
          sourceReference: `${input.policyTitle} - ${item.sourceSection || "Policy"}`,
        },
        status: "AI_GENERATED",
      })),
      scenarios: scenariosResponse.data.map((item) => ({
        id: item.id,
        title: item.title,
        situation: item.situation,
        options: item.options,
        correctResponse: item.correctResponse,
        explanation: item.explanation,
        learningObjective: item.learningObjective,
        sourceReference: {
          sourceDocumentId: input.policyDocumentId,
          sourceSection: item.sourceSection || "Policy",
          sourcePage: null,
          sourceExcerpt: item.explanation,
          sourceReference: `${input.policyTitle} - ${item.sourceSection || "Policy"}`,
        },
        xpReward: item.xpReward,
        status: "AI_GENERATED",
      })),
      flashcards: flashcardsResponse.data.map((item) => ({
        id: item.id,
        front: item.front,
        back: item.back,
        category: item.category,
        difficulty: item.difficulty,
        sourceReference: {
          sourceDocumentId: input.policyDocumentId,
          sourceSection: item.sourceSection || "Policy",
          sourcePage: null,
          sourceExcerpt: item.back,
          sourceReference: `${input.policyTitle} - ${item.sourceSection || "Policy"}`,
        },
        status: "AI_GENERATED",
      })),
      keyRules: keyRulesResponse.data.map((item) => ({
        id: item.id,
        rule: item.rule,
        category: item.category,
        sourceReference: {
          sourceDocumentId: input.policyDocumentId,
          sourceSection: item.sourceSection || "Policy",
          sourcePage: null,
          sourceExcerpt: item.rule,
          sourceReference: `${input.policyTitle} - ${item.sourceSection || "Policy"}`,
        },
        status: "AI_GENERATED",
      })),
      grounding: {
        grounded: true,
        confidence: 0.75,
        issues: analysisResponse.data.potentialAmbiguities.map((message) => ({ message, severity: "warning" as const })),
        sourceReferences: [{
          sourceDocumentId: input.policyDocumentId,
          sourceSection: "Policy",
          sourcePage: null,
          sourceExcerpt: safeText.slice(0, 240),
          sourceReference: `${input.policyTitle} - Policy`,
        }],
      },
    };

    // Replace hardcoded grounding with real model-derived source references.
    const groundingResponse = await provider.validateContentGrounding(metadata, safeText, generatedPayload);

    // Enforce grounding quality before proceeding — content that cannot be grounded must not be published.
    const groundingData = groundingResponse.success ? groundingResponse.data : null;
    if (!groundingData || !groundingData.grounded || groundingData.confidence < 0.70) {
      throw new Error("Content grounding validation failed. Generated content could not be verified against the source policy.");
    }

    if (groundingData.sourceReferences.length > 0) {
      generatedPayload.grounding = {
        grounded: groundingData.grounded,
        confidence: groundingData.confidence,
        issues: groundingData.issues as { message: string; severity: "warning" }[],
        sourceReferences: groundingData.sourceReferences.map((ref) => ({
          sourceDocumentId: ref.sourceDocumentId || input.policyDocumentId,
          sourceSection: ref.sourceSection,
          sourcePage: null as null,
          sourceExcerpt: ref.sourceExcerpt,
          sourceReference: ref.sourceReference,
        })),
      };
    }

    await updateJobStatus(input.jobId, "VALIDATING", "Validating generated content...");
    aiGeneratedPayloadSchema.parse(generatedPayload);

    const packageValidation = validateGeneratedContent({
      policyDocumentId: input.policyDocumentId,
      summary: {
        id: `summary-${input.policyDocumentId}`,
        sourceDocumentId: input.policyDocumentId,
        title: `${input.policyTitle} summary`,
        summary: generatedPayload.summary.shortSummary,
        keyPoints: generatedPayload.summary.keyTakeaways,
        warnings: generatedPayload.summary.importantWarnings,
        status: "UNDER_REVIEW",
      },
      objectives: generatedPayload.learningObjectives.map((item, index) => ({
        id: `objective-${index + 1}`,
        text: item,
        sourceDocumentId: input.policyDocumentId,
        status: "UNDER_REVIEW",
      })),
      lessons: generatedPayload.lessons.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        estimatedMinutes: item.estimatedMinutes,
        objectives: item.learningObjectives,
        order: item.order,
        sourceDocumentId: input.policyDocumentId,
        sourceSection: item.sourceReferences[0]?.sourceSection,
        sourceExcerpt: item.sourceReferences[0]?.sourceExcerpt,
        status: "UNDER_REVIEW",
      })),
      quizQuestions: generatedPayload.quizQuestions.map((item) => ({
        id: item.id,
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        difficulty: item.difficulty,
        xpReward: item.xpReward,
        sourceDocumentId: input.policyDocumentId,
        sourceSection: item.sourceReference.sourceSection,
        sourceExcerpt: item.sourceReference.sourceExcerpt,
        status: "UNDER_REVIEW",
      })),
      scenarios: generatedPayload.scenarios.map((item) => ({
        id: item.id,
        title: item.title,
        situation: item.situation,
        options: item.options,
        correctResponse: item.correctResponse,
        explanation: item.explanation,
        learningObjective: item.learningObjective,
        xpReward: item.xpReward,
        sourceDocumentId: input.policyDocumentId,
        sourceSection: item.sourceReference.sourceSection,
        sourceExcerpt: item.sourceReference.sourceExcerpt,
        status: "UNDER_REVIEW",
      })),
      flashcards: generatedPayload.flashcards.map((item) => ({
        id: item.id,
        front: item.front,
        back: item.back,
        category: item.category,
        difficulty: item.difficulty,
        sourceDocumentId: input.policyDocumentId,
        sourceSection: item.sourceReference.sourceSection,
        sourceExcerpt: item.sourceReference.sourceExcerpt,
        status: "UNDER_REVIEW",
      })),
      keyRules: generatedPayload.keyRules.map((item) => ({
        id: item.id,
        rule: item.rule,
        category: item.category,
        sourceDocumentId: input.policyDocumentId,
        sourceSection: item.sourceReference.sourceSection,
        sourceExcerpt: item.sourceReference.sourceExcerpt,
        status: "UNDER_REVIEW",
      })),
      warnings: generatedPayload.grounding.issues.map((item) => item.message),
      status: "UNDER_REVIEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!packageValidation.valid) {
      throw new Error(packageValidation.errors.join("; "));
    }

    // Deterministic excerpt verification against the actual source document text.
    const excerptItems = [
      ...generatedPayload.lessons.map((l, i) => ({ label: `Lesson ${i + 1}`, excerpt: l.sourceReferences[0]?.sourceExcerpt })),
      ...generatedPayload.quizQuestions.map((q, i) => ({ label: `Quiz question ${i + 1}`, excerpt: q.sourceReference.sourceExcerpt })),
      ...generatedPayload.scenarios.map((s, i) => ({ label: `Scenario ${i + 1}`, excerpt: s.sourceReference.sourceExcerpt })),
      ...generatedPayload.flashcards.map((f, i) => ({ label: `Flashcard ${i + 1}`, excerpt: f.sourceReference.sourceExcerpt })),
      ...generatedPayload.keyRules.map((r, i) => ({ label: `Key rule ${i + 1}`, excerpt: r.sourceReference.sourceExcerpt })),
    ];
    const excerptErrors = validateSourceExcerpts(excerptItems, safeText);
    if (excerptErrors.length > 0) {
      throw new Error(`Source excerpt verification failed: ${excerptErrors[0]}`);
    }

    await createGeneratedContentRows({
      companyId: input.companyId,
      policyId: input.policyId,
      sourceDocumentId: input.policyDocumentId,
      createdBy: input.createdBy,
      campaignId: input.campaignId,
      payload: generatedPayload,
    });

    const inputTokens = Math.max(1, Math.ceil(safeText.length / 4));
    const outputTokens = Math.max(1, Math.ceil(JSON.stringify(generatedPayload).length / 4));
    await recordAiUsage({
      companyId: input.companyId,
      userId: input.createdBy,
      policyId: input.policyId,
      operation: "generate_content",
      model,
      inputTokens,
      outputTokens,
      estimatedCost: estimateAiCost(inputTokens, outputTokens),
    });

    await updateJobStatus(input.jobId, "READY_FOR_REVIEW", "Ready for review.");
    await logAudit(input.companyId, input.createdBy, "AI Generation Completed", input.jobId, {
      policyId: input.policyId,
      policyDocumentId: input.policyDocumentId,
    });
  } catch (error) {
    try {
      await updateJobStatus(input.jobId, "FAILED", "Generation failed. Please retry.");
      await logAudit(input.companyId, input.createdBy, "AI Generation Failed", input.jobId, {
        policyId: input.policyId,
        policyDocumentId: input.policyDocumentId,
        error: error instanceof Error ? error.message : "Unknown",
      });
    } finally {
      reportServerError(error, {
        component: "ai",
        operation: "process_generation_job",
        failure_scope: "background_job",
        provider: providerName,
        job_id: input.jobId,
      });
    }
  }
}
