import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, jest } from "@jest/globals";
import {
  CampaignAssignmentPanel,
  submitCampaignAssignments,
} from "./campaign-assignment-manager";
import type {
  CampaignAssignmentData,
  CampaignAssignedParticipant,
} from "@/services/admin/campaign-management.service";

const participant: CampaignAssignedParticipant = {
  id: "participant-persisted-id",
  campaign_id: "campaign-a",
  employee_id: "employee-assigned",
  assigned_at: "2026-10-08T12:00:00.000Z",
  status: "assigned",
  completion_percentage: 0,
  completed_at: null,
  employee: {
    id: "employee-assigned",
    first_name: "Jordan",
    last_name: "Employee",
    email: "jordan@example.test",
    employee_number: null,
  },
};

const data: CampaignAssignmentData = {
  eligibleEmployees: [{
    id: "employee-eligible",
    first_name: "Taylor",
    last_name: "Worker",
    email: "taylor@example.test",
    employee_number: "E-17",
  }],
  participants: [participant],
};

function renderPanel(overrides: Partial<Parameters<typeof CampaignAssignmentPanel>[0]> = {}) {
  return renderToStaticMarkup(createElement(CampaignAssignmentPanel, {
    data: null,
    isLoading: false,
    loadError: "",
    isSaving: false,
    message: "",
    isError: false,
    selectedIds: [],
    onRetry: () => {},
    onSubmit: () => {},
    onEmployeeToggle: () => {},
    ...overrides,
  }));
}

describe("campaign assignment UI", () => {
  it("shows a loading state while persisted employees and assignments load", () => {
    expect(renderPanel({ isLoading: true })).toContain("Loading employees and assignments");
  });

  it("shows an explicit retry state when assignment data fails to load", () => {
    const markup = renderPanel({ loadError: "Assignments could not be loaded." });
    expect(markup).toContain("Assignments could not be loaded.");
    expect(markup).toContain("Retry loading assignments");
    expect(markup).toContain('role="alert"');
  });

  it("shows honest empty states when there are no unassigned or assigned employees", () => {
    const markup = renderPanel({
      data: { eligibleEmployees: [], participants: [] },
    });
    expect(markup).toContain("No unassigned employees are available");
    expect(markup).toContain("No employees have been assigned");
    expect(markup).not.toContain("sample");
  });

  it("renders actual assigned and eligible employee records with saving and success states", () => {
    const markup = renderPanel({
      data,
      isSaving: true,
      message: "1 employee(s) assigned.",
      selectedIds: ["employee-eligible"],
    });
    expect(markup).toContain("Taylor Worker");
    expect(markup).toContain("Jordan Employee");
    expect(markup).toContain("jordan@example.test");
    expect(markup).toContain("Assigning...");
    expect(markup).toContain("Saving assignments");
    expect(markup).toContain("1 employee(s) assigned.");
    expect(markup).not.toContain("employee-fabricated");
  });

  it("reconciles a lost POST response from persisted assignment data before retrying", async () => {
    const fetcher = jest.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("connection interrupted"))
      .mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }));
    const onData = jest.fn<(nextData: CampaignAssignmentData) => void>();
    const onMessage = jest.fn<(message: string) => void>();

    await submitCampaignAssignments({
      campaignId: "campaign-a",
      employeeIds: ["employee-eligible"],
      fetcher,
      onData,
      onMessage,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: "GET" });
    expect(onData).toHaveBeenCalledWith(data);
    expect(onMessage).toHaveBeenCalledWith(
      "The connection was interrupted. Current assignments have been refreshed; check them before retrying."
    );
  });

  it("refreshes persisted assignments after a server error that may follow a committed write", async () => {
    const fetcher = jest.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ error: "Could not save campaign assignments. Refresh and retry." }),
        { status: 500 }
      ))
      .mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 200 }));
    const onData = jest.fn<(nextData: CampaignAssignmentData) => void>();
    const onMessage = jest.fn<(message: string) => void>();

    await submitCampaignAssignments({
      campaignId: "campaign-a",
      employeeIds: ["employee-eligible"],
      fetcher,
      onData,
      onMessage,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenCalledWith(data);
    expect(onMessage).toHaveBeenCalledWith(
      "Could not save campaign assignments. Refresh and retry. Current assignments have been refreshed; review them before retrying."
    );
  });
});
