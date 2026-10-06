import { describe, expect, it } from "@jest/globals";
import {
  canAccessCompany,
  canAccessRoute,
  requireRole,
  sanitizeCompanyContext,
  type AuthorizationContext,
} from "./authorization.service";

describe("tenant authorization", () => {
  const companyA: AuthorizationContext = {
    userId: "u-a",
    companyId: "company-a",
    role: "employee",
    companyName: "Company A",
  };

  const companyAdmin: AuthorizationContext = {
    userId: "u-admin",
    companyId: "company-a",
    role: "admin",
    companyName: "Company A",
  };

  it("allows a company employee to access their own company mission", () => {
    expect(canAccessCompany(companyA, "company-a")).toBe(true);
    expect(canAccessRoute(companyA, "/today")).toBe(true);
  });

  it("denies cross-company access", () => {
    expect(canAccessCompany(companyA, "company-b")).toBe(false);
    expect(canAccessRoute(companyA, "/admin/reports")).toBe(false);
  });

  it("allows admins to access company admin screens", () => {
    expect(canAccessCompany(companyAdmin, "company-a")).toBe(true);
    expect(canAccessRoute(companyAdmin, "/admin/reports")).toBe(true);
  });

  it("rejects role tampering and browser company overrides", () => {
    expect(sanitizeCompanyContext({ companyId: "company-b", role: "admin" }, companyA)).toEqual({
      companyId: "company-a",
      role: "employee",
    });
    expect(() => requireRole("admin", companyA)).toThrow("Unauthorized");
  });
});
