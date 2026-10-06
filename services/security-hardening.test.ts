import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { canAccessCompany } from "@/services/authorization.service";
import { canTriggerAiGeneration } from "@/services/ai/ai-security.service";
import { acceptInvitation, createInvitation } from "@/services/invitation.service";
import { requireCronSecret } from "@/services/automation/scheduler.service";
import { enforceRateLimit } from "@/lib/security/api-security";

describe("phase 7j security hardening", () => {
  it("denies cross-company access attempts", () => {
    const employeeA = {
      userId: "employee-a",
      companyId: "company-a",
      role: "employee" as const,
    };

    expect(canAccessCompany(employeeA, "company-a")).toBe(true);
    expect(canAccessCompany(employeeA, "company-b")).toBe(false);
  });

  it("blocks employee AI generation and allows same-company admins", () => {
    expect(
      canTriggerAiGeneration({
        requesterRole: "employee",
        requesterCompanyId: "company-a",
        policyCompanyId: "company-a",
        policyDocumentCompanyId: "company-a",
      })
    ).toBe(false);

    expect(
      canTriggerAiGeneration({
        requesterRole: "admin",
        requesterCompanyId: "company-a",
        policyCompanyId: "company-a",
        policyDocumentCompanyId: "company-a",
      })
    ).toBe(true);
  });

  it("prevents invitation replay after acceptance", () => {
    const invitation = createInvitation({
      companyId: "company-a",
      employeeId: "employee-a",
      email: "employee.a@example.com",
      invitedBy: "admin-a",
    });

    const accepted = acceptInvitation({
      invitation,
      suppliedToken: invitation.rawToken,
    });

    expect(accepted.accepted).toBe(true);

    expect(() =>
      acceptInvitation({
        invitation: {
          ...invitation,
          status: "ACCEPTED",
          acceptedAt: accepted.acceptedAt,
        },
        suppliedToken: invitation.rawToken,
      })
    ).toThrow("already been accepted");
  });

  it("enforces cron secret authentication", () => {
    process.env.CRON_SECRET = "cron-secret";

    expect(() => requireCronSecret(new Request("https://example.com"))).toThrow();
    expect(() =>
      requireCronSecret(new Request("https://example.com", { headers: { "x-cron-secret": "wrong" } }))
    ).toThrow();

    expect(() =>
      requireCronSecret(new Request("https://example.com", { headers: { "x-cron-secret": "cron-secret" } }))
    ).not.toThrow();
  });

  it("rate limits repeated bursts on sensitive endpoints", () => {
    const request = new NextRequest("https://example.com/api/ai/generate", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.20",
      },
    });

    const first = enforceRateLimit({
      request,
      key: "test-ai-generate",
      maxRequests: 2,
      windowMs: 60_000,
    });

    const second = enforceRateLimit({
      request,
      key: "test-ai-generate",
      maxRequests: 2,
      windowMs: 60_000,
    });

    const third = enforceRateLimit({
      request,
      key: "test-ai-generate",
      maxRequests: 2,
      windowMs: 60_000,
    });

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(third?.status).toBe(429);
  });

  it("restricts company admin helper execution to authenticated and service roles", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "011_phase9_restrict_company_admin_execute.sql"),
      "utf8"
    );

    expect(migration).toContain("revoke execute on function public.is_company_admin(uuid) from public, anon;");
    expect(migration).toContain("grant execute on function public.is_company_admin(uuid) to authenticated, service_role;");
  });
});
