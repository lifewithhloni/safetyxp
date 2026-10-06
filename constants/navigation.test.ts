import { describe, expect, it } from "@jest/globals";
import {
  employeeExperienceNavigation,
  getNavigationItemsForRole,
} from "@/constants/navigation";

describe("employee navigation", () => {
  it("maps employee destinations to their implemented routes", () => {
    expect(employeeExperienceNavigation).toEqual([
      { href: "/today", label: "Home", available: true },
      { href: "/lesson", label: "My Learning", available: true },
      { href: "/today#mission", label: "Missions", available: true },
      { href: "/quick-check", label: "Knowledge Checks", available: true },
      { href: "/certificates", label: "Certificates", available: true },
      { href: "/rewards", label: "Rewards", available: true },
      { href: "/today#progress", label: "My Progress", available: true },
      { href: "/today#resources", label: "Resources", available: true },
      { href: "/help", label: "Help & Support", available: true },
    ]);
  });

  it("keeps employee destinations and hides Admin for employees", () => {
    expect(getNavigationItemsForRole("employee").map(({ href }) => href)).toEqual([
      "/today",
      "/lesson",
      "/certificates",
      "/profile",
    ]);
  });

  it.each(["admin", "super_admin"] as const)("shows Admin for %s", (role) => {
    expect(getNavigationItemsForRole(role).map(({ href }) => href)).toContain("/admin");
  });

  it("keeps navigation usable while the role is not yet available", () => {
    expect(getNavigationItemsForRole(null).map(({ href }) => href)).toEqual([
      "/today",
      "/lesson",
      "/certificates",
      "/profile",
    ]);
  });
});
