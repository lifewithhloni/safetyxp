import type {
  GeneratedContentPackage,
  QuizQuestion,
  ScenarioChallenge,
  LearningModule,
  FlashcardItem,
  PolicySummary,
  KeyRule,
} from "@/types/ai-content";

export function validateGeneratedContent(content: GeneratedContentPackage): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content.summary.summary.trim()) {
    errors.push("Policy summary is empty.");
  }

  if (content.objectives.length === 0) {
    errors.push("Missing learning objectives.");
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
  });

  content.flashcards.forEach((flashcard, index) => {
    if (!flashcard.front.trim()) {
      errors.push(`Flashcard ${index + 1} is missing front text.`);
    }
    if (!flashcard.back.trim()) {
      errors.push(`Flashcard ${index + 1} is missing back text.`);
    }
  });

  content.keyRules.forEach((rule, index) => {
    if (!rule.rule.trim()) {
      errors.push(`Key rule ${index + 1} is missing rule text.`);
    }
  });

  return { valid: errors.length === 0, errors };
}
