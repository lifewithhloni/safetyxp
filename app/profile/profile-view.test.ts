import { describe, expect, it } from "@jest/globals";
import { getProfileView } from "@/app/profile/profile-view";

describe("profile view", () => {
  it("uses the authenticated profile and company rather than demo identity", () => {
    const view = getProfileView(
      {
        id: "authenticated-user",
        email: "lehlohonolo@example.com",
        fullName: "Lehlohonolo Maishoane",
        role: "employee",
        companyId: "company-1",
        isActive: true,
      },
      {
        id: "company-1",
        name: "SafetyXP Company",
        slug: "safetyxp-company",
        plan: "basic",
        isActive: true,
      },
    );

    expect(view).toEqual({
      name: "Lehlohonolo Maishoane",
      initials: "LM",
      email: "lehlohonolo@example.com",
      role: "employee",
      company: "SafetyXP Company",
    });
    expect(view.name).not.toBe("Maya Chen");
  });

  it("does not invent profile details when auth data is unavailable", () => {
    expect(getProfileView(null, null)).toEqual({
      name: "Profile unavailable",
      initials: "PU",
      email: "Not provided",
      role: "Not available",
      company: "Not available",
    });
  });
});
