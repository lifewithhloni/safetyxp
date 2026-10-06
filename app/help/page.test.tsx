import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockUseAuth = jest.fn();

jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => createElement("div", null, children),
}));

import HelpPage from "@/app/help/page";

describe("HelpPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gives unassigned employees company guidance without fabricating contact details", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      company: null,
    });

    const markup = renderToStaticMarkup(createElement(HelpPage));

    expect(markup).toContain("You are not currently assigned to a company");
    expect(markup).toContain("Contact your SafetyXP administrator if you need help joining your organization.");
    expect(markup).toContain("An official SafetyXP support contact is not configured in this workspace yet.");
    expect(markup).toContain("Report a problem directly in SafetyXP is not available yet.");
    expect(markup).not.toContain("mailto:");
  });

  it("uses the authenticated company name without inventing an admin email", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      company: { name: "Authenticated Company" },
    });

    const markup = renderToStaticMarkup(createElement(HelpPage));

    expect(markup).toContain("Authenticated Company");
    expect(markup).toContain("Contact your company safety/admin team");
    expect(markup).not.toContain("mailto:");
  });
});
