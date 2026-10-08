import { describe, expect, it } from "@jest/globals";
import {
  canAccessRoute,
  getRedirectTargetForRole,
  isAdminRoutePath,
  isProtectedRoutePath,
  type AuthContext,
} from "./auth-utils";

describe("auth routing and policy helpers", () => {
  const adminContext: AuthContext = {
    user: { id: "u1", email: "admin@test.safetyxp.local" },
    profile: { id: "u1", company_id: "c1", role: "admin" },
    company: { id: "c1", name: "Acme" },
  };

  const employeeContext: AuthContext = {
    user: { id: "u2", email: "employee@test.safetyxp.local" },
    profile: { id: "u2", company_id: "c1", role: "employee" },
    company: { id: "c1", name: "Acme" },
  };

  it("routes admins to the admin dashboard", () => {
    expect(getRedirectTargetForRole("admin")).toBe("/admin/dashboard");
    expect(getRedirectTargetForRole("employee")).toBe("/today");
  });

  it("allows an admin to access admin routes", () => {
    expect(canAccessRoute(adminContext, "/admin/reports")).toBe(true);
    expect(
      canAccessRoute(
        {
          ...adminContext,
          profile: { id: "u1", company_id: "c1", role: "super_admin" },
        },
        "/admin/reports"
      )
    ).toBe(true);
  });

  it("blocks employees from admin routes", () => {
    expect(canAccessRoute(employeeContext, "/admin/reports")).toBe(false);
  });

  it("treats every admin page and nested route as protected", () => {
    for (const pathname of [
      "/admin",
      "/admin/learning-campaigns",
      "/admin/assign-employees",
      "/admin/content-studio",
      "/admin/employees/import",
    ]) {
      expect(isAdminRoutePath(pathname)).toBe(true);
      expect(isProtectedRoutePath(pathname)).toBe(true);
    }
  });

  it("does not classify similarly named non-admin paths as admin routes", () => {
    expect(isAdminRoutePath("/administrator")).toBe(false);
    expect(isAdminRoutePath("/administer")).toBe(false);
  });

  it("requires a valid profile and company membership", () => {
    expect(canAccessRoute({ user: { id: "u3", email: "x@y.com" }, profile: null, company: null }, "/today")).toBe(false);
  });
});
