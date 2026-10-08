import { describe, expect, it, jest } from "@jest/globals";
import {
  saveCampaignDraft,
  type CampaignDraftPayload,
} from "./campaign-wizard";

const payload: CampaignDraftPayload = {
  name: "Safety Induction",
  officialDeadline: "2026-12-31",
  bufferDays: 2,
};

function createDependencies(fetcher: typeof fetch) {
  return {
    payload,
    fetcher,
    savingRef: { current: false },
    onSavingChange: jest.fn<(saving: boolean) => void>(),
    onSaved: jest.fn<(campaignId: string) => void>(),
    onError: jest.fn<(message: string) => void>(),
  };
}

describe("Campaign Wizard Save Draft", () => {
  it("posts only API-supported campaign fields and retains the returned database ID", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(
      Response.json({ id: "persisted-campaign-id", company_id: "company-a", status: "draft" }, { status: 201 })
    );
    const dependencies = createDependencies(fetcher);

    await saveCampaignDraft(dependencies);

    expect(fetcher).toHaveBeenCalledWith("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const requestBody = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(requestBody).toEqual({
      name: "Safety Induction",
      officialDeadline: "2026-12-31",
      bufferDays: 2,
    });
    for (const forbiddenField of [
      "company_id",
      "companyId",
      "created_by",
      "createdBy",
      "status",
      "published_at",
      "publishedAt",
    ]) {
      expect(requestBody).not.toHaveProperty(forbiddenField);
    }
    expect(dependencies.onSaved).toHaveBeenCalledWith("persisted-campaign-id");
    expect(dependencies.onError).toHaveBeenLastCalledWith("");
  });

  it("prevents duplicate submissions while a save is in progress", async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetcher = jest.fn<typeof fetch>().mockImplementation(() => new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    const dependencies = createDependencies(fetcher);

    const firstSave = saveCampaignDraft(dependencies);
    await saveCampaignDraft(dependencies);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(dependencies.onSavingChange).toHaveBeenCalledWith(true);

    resolveResponse?.(Response.json({ id: "persisted-campaign-id" }, { status: 201 }));
    await firstSave;

    expect(dependencies.savingRef.current).toBe(false);
    expect(dependencies.onSavingChange).toHaveBeenLastCalledWith(false);
  });

  it("shows a safe API error and leaves form values untouched for retry", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(
      Response.json({ error: "Campaign name is required." }, { status: 400 })
    );
    const dependencies = createDependencies(fetcher);
    const enteredName = payload.name;

    await saveCampaignDraft(dependencies);

    expect(dependencies.onError).toHaveBeenLastCalledWith("Campaign name is required.");
    expect(dependencies.onSaved).not.toHaveBeenCalled();
    expect(payload.name).toBe(enteredName);
    expect(dependencies.savingRef.current).toBe(false);
  });

  it("uses a friendly error when the request fails unexpectedly", async () => {
    const fetcher = jest.fn<typeof fetch>().mockRejectedValue(
      new Error("database secret stack trace")
    );
    const dependencies = createDependencies(fetcher);

    await saveCampaignDraft(dependencies);

    expect(dependencies.onError).toHaveBeenLastCalledWith(
      "Campaign draft could not be saved. Check your connection and try again."
    );
    expect(dependencies.onError).not.toHaveBeenCalledWith("database secret stack trace");
    expect(dependencies.onSaved).not.toHaveBeenCalled();
  });

  it("does not claim success if the API response contains no persisted campaign ID", async () => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(
      Response.json({ status: "draft" }, { status: 201 })
    );
    const dependencies = createDependencies(fetcher);

    await saveCampaignDraft(dependencies);

    expect(dependencies.onSaved).not.toHaveBeenCalled();
    expect(dependencies.onError).toHaveBeenLastCalledWith(
      "The campaign response was incomplete. Please try again."
    );
  });
});
