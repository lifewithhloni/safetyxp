import { describe, expect, it, jest } from "@jest/globals";
import { saveCampaignModule } from "./campaign-module-manager";
import type { LearningModuleRecord } from "@/services/admin/campaign-management.service";

const persistedModule: LearningModuleRecord = {
  id: "real-module-id",
  campaign_id: "campaign-id",
  title: "Emergency response",
  description: null,
  content: null,
  estimated_minutes: null,
  order_index: 0,
  status: "draft",
  created_at: "2026-10-08T00:00:00.000Z",
};

describe("campaign module save flow", () => {
  it("sends supported module fields and retains the database ID from the response", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(
      Response.json({ modules: [persistedModule] }, { status: 201 })
    );
    const savingRef = { current: false };
    const onCreated = jest.fn<(modules: LearningModuleRecord[]) => void>();
    const onError = jest.fn<(message: string) => void>();

    await saveCampaignModule({
      campaignId: "campaign-id",
      payload: {
        title: "Emergency response",
        description: null,
        content: null,
        estimatedMinutes: null,
        orderIndex: 0,
      },
      fetcher,
      savingRef,
      onSavingChange: () => undefined,
      onCreated,
      onError,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/api/admin/campaigns/campaign-id/modules",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          modules: [{
            title: "Emergency response",
            description: null,
            content: null,
            estimatedMinutes: null,
            orderIndex: 0,
          }],
        }),
      })
    );
    const requestOptions = fetcher.mock.calls[0]?.[1];
    expect(requestOptions?.body).not.toContain("company_id");
    expect(requestOptions?.body).not.toContain("status");
    expect(onCreated).toHaveBeenCalledWith([persistedModule]);
    expect(onError).toHaveBeenCalledWith("");
  });

  it("prevents duplicate saves while the first request is pending", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetcher = jest.fn<typeof fetch>().mockImplementation(() =>
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      })
    );
    const dependencies = {
      campaignId: "campaign-id",
      payload: { title: "Emergency response" },
      fetcher,
      savingRef: { current: false },
      onSavingChange: () => undefined,
      onCreated: () => undefined,
      onError: () => undefined,
    };

    const firstSave = saveCampaignModule(dependencies);
    await saveCampaignModule(dependencies);
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveResponse?.(Response.json({ modules: [persistedModule] }, { status: 201 }));
    await firstSave;
  });

  it("reports safe failures without treating them as successful saves", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(
      Response.json({ error: "Learning module could not be saved." }, { status: 500 })
    );
    const onCreated = jest.fn<(modules: LearningModuleRecord[]) => void>();
    const onError = jest.fn<(message: string) => void>();

    await saveCampaignModule({
      campaignId: "campaign-id",
      payload: { title: "Emergency response" },
      fetcher,
      savingRef: { current: false },
      onSavingChange: () => undefined,
      onCreated,
      onError,
    });

    expect(onError).toHaveBeenCalledWith("Learning module could not be saved.");
    expect(onCreated).not.toHaveBeenCalled();
  });
});
