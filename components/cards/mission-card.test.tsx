import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockUseAuth = jest.fn();
const mockGetTodaysMission = jest.fn();

jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/services/mission.service", () => ({
  getTodaysMission: (employeeId: string) => mockGetTodaysMission(employeeId),
}));

import { MissionCard } from "@/components/cards/mission-card";

describe("MissionCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: "authenticated-employee-id" },
    });
    mockGetTodaysMission.mockReturnValue(null);
  });

  it("looks up the mission for the authenticated employee without inventing progress", () => {
    mockGetTodaysMission.mockReturnValue({
      id: "mission-1",
      title: "Assigned safety lesson",
      description: "Review the assigned guidance.",
      type: "lesson",
      estimatedMinutes: 10,
      status: "Available",
    });

    const markup = renderToStaticMarkup(createElement(MissionCard));

    expect(mockGetTodaysMission).toHaveBeenCalledWith("authenticated-employee-id");
    expect(markup).toContain("Assigned safety lesson");
    expect(markup).toContain("10 min");
    expect(markup).not.toContain("% complete");
    expect(markup).not.toContain("XP");
  });

  it("shows a neutral unavailable state when there is no mission for the authenticated employee", () => {
    const markup = renderToStaticMarkup(createElement(MissionCard));

    expect(mockGetTodaysMission).toHaveBeenCalledWith("authenticated-employee-id");
    expect(markup).toContain("No mission details available");
    expect(markup).not.toContain("emp-001");
  });
});
