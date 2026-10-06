import type {
  GeneratedContentPackage,
  QuizQuestion,
  ScenarioChallenge,
  LearningModule,
  FlashcardItem,
  PolicySummary,
  KeyRule,
} from "@/types/ai-content";

export const MINIMUM_CONTENT_COUNTS = {
  lessons: 2,
  quizQuestions: 2,
  scenarios: 1,
  flashcards: 2,
  keyRules: 2,
  objectives: 1,
} as const;

// Confidence threshold matches the grounding check in ai-job.service.ts.
export const GROUNDING_CONFIDENCE_THRESHOLD = 0.70;

export function normalizeForExcerptCheck(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function validateSourceExcerpts(
  items: { label: string; excerpt: string | undefined }[],
  sourceText: string
): string[] {
  const errors: string[] = [];
  if (!sourceText || sourceText.trim().length === 0) {
    errors.push("Source text is unavailable for excerpt verification.");
    return errors;
  }
  const normalizedSource = normalizeForExcerptCheck(sourceText);
  for (const item of items) {
    if (!item.excerpt || item.excerpt.trim().length === 0) {
      errors.push(`${item.label} has an empty source excerpt.`);
    } else if (!normalizedSource.includes(normalizeForExcerptCheck(item.excerpt))) {
      errors.push(`${item.label} source excerpt not found in source document.`);
    }
  }
  return errors;
}

export function validateGeneratedContent(content: GeneratedContentPackage): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content.summary.summary.trim()) {
    errors.push("Policy summary is empty.");
  }

  if (content.objectives.length < MINIMUM_CONTENT_COUNTS.objectives) {
    errors.push("Missing learning objectives.");
  }

  if (content.lessons.length < MINIMUM_CONTENT_COUNTS.lessons) {
    errors.push(`At least ${MINIMUM_CONTENT_COUNTS.lessons} lessons are required.`);
  }

  if (content.quizQuestions.length < MINIMUM_CONTENT_COUNTS.quizQuestions) {
    errors.push(`At least ${MINIMUM_CONTENT_COUNTS.quizQuestions} quiz questions are required.`);
  }

  if (content.scenarios.length < MINIMUM_CONTENT_COUNTS.scenarios) {
    errors.push(`At least ${MINIMUM_CONTENT_COUNTS.scenarios} scenario is required.`);
  }

  if (content.flashcards.length < MINIMUM_CONTENT_COUNTS.flashcards) {
    errors.push(`At least ${MINIMUM_CONTENT_COUNTS.flashcards} flashcards are required.`);
  }

  if (content.keyRules.length < MINIMUM_CONTENT_COUNTS.keyRules) {
    errors.push(`At least ${MINIMUM_CONTENT_COUNTS.keyRules} key rules are required.`);
  }

  content.lessons.forEach((lesson, index) => {
    if (!lesson.title.trim()) {
      errors.push(`Lesson ${index + 1} is missing a title.`);
    }
    if (!lesson.description.trim()) {
      errors.push(`Lesson ${index + 1} is missing a description.`);
    }
    if (lesson.estimatedMinutes <= 0) {
      errors.push(`Lesson ${index + 1} has invalid estimated minutes.`);
    }
    if (lesson.estimatedMinutes < 5 || lesson.estimatedMinutes > 15) {
      errors.push(`Lesson ${index + 1} estimated minutes should be between 5 and 15.`);
    }
    if (!lesson.sourceDocumentId || !lesson.sourceSection?.trim() || !lesson.sourceExcerpt?.trim()) {
      errors.push(`Lesson ${index + 1} is missing source traceability.`);
    }
  });

  const duplicateLessonTitles = new Set<string>();
  content.lessons.forEach((lesson, index) => {
    const key = lesson.title.trim().toLowerCase();
    if (duplicateLessonTitles.has(key)) {
      errors.push(`Duplicate lesson title detected at lesson ${index + 1}: ${lesson.title}`);
    }
    duplicateLessonTitles.add(key);
  });

  const quizIds = new Set<string>();
  content.quizQuestions.forEach((question, index) => {
    if (!question.question.trim()) {
      errors.push(`Quiz question ${index + 1} is missing the question text.`);
    }
    if (question.options.length < 2) {
      errors.push(`Quiz question ${index + 1} needs at least two options.`);
    }
    if (!question.correctAnswer.trim()) {
      errors.push(`Quiz question ${index + 1} is missing a correct answer.`);
    }
    if (!question.explanation.trim()) {
      errors.push(`Quiz question ${index + 1} is missing an explanation.`);
    }
    if (!question.options.includes(question.correctAnswer)) {
      errors.push(`Quiz question ${index + 1} correct answer must be one of the options.`);
    }
    if (quizIds.has(question.question)) {
      errors.push(`Duplicate quiz question detected: ${question.question}`);
    }
    quizIds.add(question.question);
    if (question.xpReward <= 0) {
      errors.push(`Quiz question ${index + 1} has invalid XP reward.`);
    }
    if (!question.sourceDocumentId || !question.sourceSection?.trim() || !question.sourceExcerpt?.trim()) {
      errors.push(`Quiz question ${index + 1} is missing source traceability.`);
    }
  });

  content.scenarios.forEach((scenario, index) => {
    if (!scenario.title.trim()) {
      errors.push(`Scenario ${index + 1} is missing a title.`);
    }
    if (!scenario.situation.trim()) {
      errors.push(`Scenario ${index + 1} is missing a situation description.`);
    }
    if (!scenario.correctResponse.trim()) {
      errors.push(`Scenario ${index + 1} is missing a correct response.`);
    }
    if (!scenario.options.includes(scenario.correctResponse)) {
      errors.push(`Scenario ${index + 1} correct response must be one of the options.`);
    }
    if (!scenario.explanation.trim()) {
      errors.push(`Scenario ${index + 1} is missing an explanation.`);
    }
    if (scenario.xpReward <= 0) {
      errors.push(`Scenario ${index + 1} has invalid XP reward.`);
    }
    if (!scenario.sourceDocumentId || !scenario.sourceSection?.trim() || !scenario.sourceExcerpt?.trim()) {
      errors.push(`Scenario ${index + 1} is missing source traceability.`);
    }
  });

  const flashcardSet = new Set<string>();
  content.flashcards.forEach((flashcard, index) => {
    if (!flashcard.front.trim()) {
      errors.push(`Flashcard ${index + 1} is missing front text.`);
    }
    if (!flashcard.back.trim()) {
      errors.push(`Flashcard ${index + 1} is missing back text.`);
    }
    if (!flashcard.sourceDocumentId || !flashcard.sourceSection?.trim() || !flashcard.sourceExcerpt?.trim()) {
      errors.push(`Flashcard ${index + 1} is missing source traceability.`);
    }
    const cardKey = `${flashcard.front.trim().toLowerCase()}::${flashcard.back.trim().toLowerCase()}`;
    if (flashcardSet.has(cardKey)) {
      errors.push(`Duplicate flashcard detected at item ${index + 1}.`);
    }
    flashcardSet.add(cardKey);
  });

  content.keyRules.forEach((rule, index) => {
    if (!rule.rule.trim()) {
      errors.push(`Key rule ${index + 1} is missing rule text.`);
    }
    if (!rule.sourceDocumentId || !rule.sourceSection?.trim() || !rule.sourceExcerpt?.trim()) {
      errors.push(`Key rule ${index + 1} is missing source traceability.`);
    }
  });

  return { valid: errors.length === 0, errors };
}
