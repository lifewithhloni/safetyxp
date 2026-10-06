export type CertificateRequirementConfig = {
  requiredLessonCompletion: boolean;
  requiredQuizCompletion: boolean;
  requiredScenarioCompletion: boolean;
  requiresFinalAssessment: boolean;
  minimumQuizScore: number;
  minimumFinalAssessmentScore: number;
  certificateExpiryDays: number | null;
};

export type CertificateProgressSnapshot = {
  participantStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  requiredLessonsCompleted: boolean;
  requiredQuizzesPassed: boolean;
  requiredScenariosCompleted: boolean;
  finalAssessmentPassed: boolean;
  quizScore: number | null;
  finalAssessmentScore: number | null;
};

export type CertificateEligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

export const defaultCertificateRequirements: CertificateRequirementConfig = {
  requiredLessonCompletion: true,
  requiredQuizCompletion: true,
  requiredScenarioCompletion: true,
  requiresFinalAssessment: false,
  minimumQuizScore: 80,
  minimumFinalAssessmentScore: 80,
  certificateExpiryDays: 365,
};

export function isEligibleForCertificate(config: CertificateRequirementConfig, snapshot: CertificateProgressSnapshot) {
  return evaluateCertificateEligibility(config, snapshot).eligible;
}

export function evaluateCertificateEligibility(config: CertificateRequirementConfig, snapshot: CertificateProgressSnapshot): CertificateEligibilityResult {
  const reasons: string[] = [];

  if (snapshot.participantStatus !== "COMPLETED") {
    reasons.push("Campaign participant is not completed.");
  }

  if (config.requiredLessonCompletion && !snapshot.requiredLessonsCompleted) {
    reasons.push("Required lessons are not complete.");
  }

  if (config.requiredQuizCompletion && !snapshot.requiredQuizzesPassed) {
    reasons.push("Required quizzes are not passed.");
  }

  if (config.requiredQuizCompletion && (snapshot.quizScore ?? 0) < config.minimumQuizScore) {
    reasons.push(`Minimum quiz score of ${config.minimumQuizScore}% not met.`);
  }

  if (config.requiredScenarioCompletion && !snapshot.requiredScenariosCompleted) {
    reasons.push("Required scenarios are not complete.");
  }

  if (config.requiresFinalAssessment && !snapshot.finalAssessmentPassed) {
    reasons.push("Final assessment is required and not passed.");
  }

  if (config.requiresFinalAssessment && (snapshot.finalAssessmentScore ?? 0) < config.minimumFinalAssessmentScore) {
    reasons.push(`Minimum final assessment score of ${config.minimumFinalAssessmentScore}% not met.`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

export function getCertificateEligibility(config: CertificateRequirementConfig, snapshot: CertificateProgressSnapshot) {
  const evaluation = evaluateCertificateEligibility(config, snapshot);
  return {
    status: evaluation.eligible ? "ELIGIBLE" : "NOT_ELIGIBLE",
    reasons: evaluation.reasons,
  };
}
