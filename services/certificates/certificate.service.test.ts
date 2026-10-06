import { describe, expect, it } from "@jest/globals";
import {
  defaultCertificateRequirements,
  evaluateCertificateEligibility,
} from "./certificate-eligibility.service";
import {
  generateCertificateNumber,
  generateVerificationCode,
} from "./certificate-generation.service";
import { getCertificateStatus } from "./certificate-verification.service";

describe("certificate eligibility and verification", () => {
  it("marks employee eligible when required completion is satisfied", () => {
    const result = evaluateCertificateEligibility(defaultCertificateRequirements, {
      participantStatus: "COMPLETED",
      requiredLessonsCompleted: true,
      requiredQuizzesPassed: true,
      requiredScenariosCompleted: true,
      finalAssessmentPassed: true,
      quizScore: 90,
      finalAssessmentScore: 88,
    });

    expect(result.eligible).toBe(true);
  });

  it("blocks eligibility when a required quiz is not passed", () => {
    const result = evaluateCertificateEligibility(defaultCertificateRequirements, {
      participantStatus: "COMPLETED",
      requiredLessonsCompleted: true,
      requiredQuizzesPassed: false,
      requiredScenariosCompleted: true,
      finalAssessmentPassed: true,
      quizScore: 50,
      finalAssessmentScore: 88,
    });

    expect(result.eligible).toBe(false);
    expect(result.reasons.some((reason) => reason.includes("quiz"))).toBe(true);
  });

  it("generates unique looking identifiers", () => {
    const a = generateCertificateNumber(new Date("2026-08-12"));
    const b = generateCertificateNumber(new Date("2026-08-12"));
    const code = generateVerificationCode();

    expect(a).not.toBe(b);
    expect(a.startsWith("SXP-2026-")).toBe(true);
    expect(code.length).toBeGreaterThan(20);
  });

  it("returns revoked and expired states accurately", () => {
    const revoked = getCertificateStatus("revoked", null);
    const expired = getCertificateStatus("issued", new Date(Date.now() - 86400000).toISOString());
    const valid = getCertificateStatus("issued", new Date(Date.now() + 86400000).toISOString());

    expect(revoked).toBe("REVOKED");
    expect(expired).toBe("EXPIRED");
    expect(valid).toBe("VALID");
  });
});
