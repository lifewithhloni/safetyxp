import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, jest } from "@jest/globals";
import {
  CampaignDirectoryView,
  fetchCompanyCampaignRecords,
  formatCampaignStatus,
} from "./campaign-directory";
import type { CampaignRecord } from "@/services/admin/campaign-management.service";

const campaign: CampaignRecord = {
  id: "persisted-campaign-id",
  company_id: "company-a",
  name: "Workplace Safety",
  description: "Annual safety training",
  official_deadline: "2026-12-31T00:00:00.000Z",
  learning_deadline: "2026-12-29T00:00:00.000Z",
  buffer_days: 2,
  status: "draft",
  created_by: "admin-a",
  published_at: null,
  created_at: "2026-10-08T12:00:00.000Z",
  updated_at: "2026-10-08T12:00:00.000Z",
};

describe("company campaign directory", () => {
  it("fetches real records from the existing campaigns API", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(
      Response.json([campaign])
    );

    await expect(fetchCompanyCampaignRecords(fetcher)).resolves.toEqual([campaign]);
    expect(fetcher).toHaveBeenCalledWith("/api/admin/campaigns", { method: "GET" });
  });

  it("renders a persisted record and its actual draft status without unsupported metrics", () => {
    const markup = renderToStaticMarkup(createElement(CampaignDirectoryView, {
      state: { status: "loaded", campaigns: [campaign] },
      onCreateCampaign: () => undefined,
      onRetry: () => undefined,
    }));

    expect(markup).toContain("Workplace Safety");
    expect(markup).toContain("Annual safety training");
    expect(markup).toContain("Draft");
    expect(markup).toContain("2026-12-31");
    expect(markup).toContain("2026-12-29");
    expect(markup).toContain("2 days");
    expect(markup).toContain('href="/admin/learning-campaigns/persisted-campaign-id"');
    expect(markup).toContain("View Campaign");
    expect(markup).not.toMatch(/employees|completion|participants|progress|certificates|risk score|modules/i);
  });

  it("formats actual campaign statuses and does not infer publication", () => {
    expect(formatCampaignStatus("draft")).toBe("Draft");
    expect(formatCampaignStatus("published")).toBe("Published");
  });

  it("renders an empty state without fixture campaigns and preserves Create Campaign", () => {
    const markup = renderToStaticMarkup(createElement(CampaignDirectoryView, {
      state: { status: "loaded", campaigns: [] },
      onCreateCampaign: () => undefined,
      onRetry: () => undefined,
    }));

    expect(markup).toContain("No campaigns yet");
    expect(markup).toContain("Create Campaign");
    expect(markup).not.toContain("Workplace Safety");
  });

  it("shows a safe error and retry action rather than falling back to mock campaigns", () => {
    const markup = renderToStaticMarkup(createElement(CampaignDirectoryView, {
      state: { status: "error", message: "Campaigns couldn't be loaded. Please try again." },
      onCreateCampaign: () => undefined,
      onRetry: () => undefined,
    }));

    expect(markup).toContain("Campaigns couldn&#x27;t be loaded. Please try again.");
    expect(markup).toContain("Try again");
    expect(markup).not.toContain("Workplace Safety");
  });

  it("renders a simple loading state", () => {
    const markup = renderToStaticMarkup(createElement(CampaignDirectoryView, {
      state: { status: "loading" },
      onCreateCampaign: () => undefined,
      onRetry: () => undefined,
    }));

    expect(markup).toContain("Loading campaigns...");
  });

  it("rejects a failed API response with a safe message and no fixture fallback", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(
      Response.json({ error: "database connection string" }, { status: 500 })
    );

    await expect(fetchCompanyCampaignRecords(fetcher)).rejects.toThrow(
      "Campaigns couldn't be loaded. Please try again."
    );
  });

  it("rejects malformed API responses rather than presenting them as campaigns", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(Response.json([{ name: "Fake" }]));

    await expect(fetchCompanyCampaignRecords(fetcher)).rejects.toThrow(
      "Campaigns couldn't be loaded. Please try again."
    );
  });
});
