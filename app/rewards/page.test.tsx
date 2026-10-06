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

import RewardsPage from "@/app/rewards/page";

describe("RewardsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows honest authenticated empty states without inventing XP, levels, or streaks", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: "authenticated-employee" },
    });

    const markup = renderToStaticMarkup(createElement(RewardsPage));

    expect(markup).toContain("XP tracking is not available for your account yet");
    expect(markup).toContain("Your achievements will appear here");
    expect(markup).toContain("Streak tracking is not available yet");
    expect(markup).not.toContain("0 XP");
    expect(markup).not.toContain("Level 1");
  });
});
