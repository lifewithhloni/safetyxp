import { describe, expect, it } from "@jest/globals";
import { getNavigationItemsForRole } from "@/constants/navigation";

describe("employee navigation", () => {
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
