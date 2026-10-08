import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "@jest/globals";
import { CampaignDetail } from "./campaign-detail";
import type {
  CampaignRecord,
  LearningModuleRecord,
} from "@/services/admin/campaign-management.service";

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

const moduleRecord: LearningModuleRecord = {
  id: "persisted-module-id",
  campaign_id: campaign.id,
  title: "Emergency response",
  description: "Initial response procedures",
  content: "Follow the emergency plan.",
  estimated_minutes: 15,
  order_index: 0,
  status: "draft",
  created_at: "2026-10-08T12:00:00.000Z",
};

describe("campaign detail", () => {
  it("renders the real campaign status and persisted learning module fields", () => {
    const markup = renderToStaticMarkup(createElement(CampaignDetail, {
      campaign,
      modules: [moduleRecord],
    }));

    expect(markup).toContain("Workplace Safety");
    expect(markup).toContain("Annual safety training");
    expect(markup).toContain("Draft");
    expect(markup).toContain("Emergency response");
    expect(markup).toContain("Initial response procedures");
    expect(markup).toContain("15 minutes");
    expect(markup).toContain("persisted-module-id");
    expect(markup).not.toMatch(/employees|completion|participants|progress|certificates|risk score|assignment/i);
  });

  it("shows an honest empty-module state without sample content", () => {
    const markup = renderToStaticMarkup(createElement(CampaignDetail, {
      campaign,
      modules: [],
    }));

    expect(markup).toContain("No learning modules yet.");
    expect(markup).not.toContain("Emergency response");
  });
});
