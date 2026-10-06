import { describe, expect, it } from "@jest/globals";
import { canAccessRoute, getRedirectTargetForRole, type AuthContext } from "./auth-utils";

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
  });

  it("blocks employees from admin routes", () => {
    expect(canAccessRoute(employeeContext, "/admin/reports")).toBe(false);
  });

  it("requires a valid profile and company membership", () => {
    expect(canAccessRoute({ user: { id: "u3", email: "x@y.com" }, profile: null, company: null }, "/today")).toBe(false);
  });
});
