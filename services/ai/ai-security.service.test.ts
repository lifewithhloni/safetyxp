import { describe, expect, it } from "@jest/globals";
import { canEmployeeReadGeneratedContent, canTriggerAiGeneration } from "./ai-security.service";

describe("ai security guards", () => {
  it("allows company admin generation for own policy and document", () => {
    expect(
      canTriggerAiGeneration({
        requesterRole: "admin",
        requesterCompanyId: "company-a",
        policyCompanyId: "company-a",
        policyDocumentCompanyId: "company-a",
      })
    ).toBe(true);
  });

  it("blocks employee from triggering generation", () => {
    expect(
      canTriggerAiGeneration({
        requesterRole: "employee",
        requesterCompanyId: "company-a",
        policyCompanyId: "company-a",
        policyDocumentCompanyId: "company-a",
      })
    ).toBe(false);
  });

  it("blocks cross-company access", () => {
    expect(
      canTriggerAiGeneration({
        requesterRole: "admin",
        requesterCompanyId: "company-a",
        policyCompanyId: "company-b",
        policyDocumentCompanyId: "company-b",
      })
    ).toBe(false);
  });

  it("only exposes published content to employee-facing paths", () => {
    expect(canEmployeeReadGeneratedContent("PUBLISHED")).toBe(true);
    expect(canEmployeeReadGeneratedContent("UNDER_REVIEW")).toBe(false);
    expect(canEmployeeReadGeneratedContent("READY_FOR_REVIEW")).toBe(false);
  });
});
