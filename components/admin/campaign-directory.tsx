"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import type { CampaignRecord } from "@/services/admin/campaign-management.service";

type CampaignDirectoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; campaigns: CampaignRecord[] };

const loadErrorMessage = "Campaigns couldn't be loaded. Please try again.";

function isCampaignRecord(value: unknown): value is CampaignRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.company_id === "string" &&
    typeof record.name === "string" &&
    (typeof record.description === "string" || record.description === null) &&
    typeof record.official_deadline === "string" &&
    typeof record.learning_deadline === "string" &&
    typeof record.buffer_days === "number" &&
    typeof record.status === "string" &&
    (typeof record.created_by === "string" || record.created_by === null) &&
    (typeof record.published_at === "string" || record.published_at === null) &&
    typeof record.created_at === "string" &&
    typeof record.updated_at === "string";
}

export async function fetchCompanyCampaignRecords(fetcher: typeof fetch): Promise<CampaignRecord[]> {
  const response = await fetcher("/api/admin/campaigns", { method: "GET" });
  if (!response.ok) {
    throw new Error(loadErrorMessage);
  }

  const result: unknown = await response.json();
  if (!Array.isArray(result) || !result.every(isCampaignRecord)) {
    throw new Error(loadErrorMessage);
  }

  return result;
}

export function formatCampaignStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function CampaignStatusBadge({ status }: { status: string }) {
  const isDraft = status.toLowerCase() === "draft";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
      isDraft ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"
    }`}>
      {formatCampaignStatus(status)}
    </span>
  );
}

export function CampaignDirectoryView({
  state,
  onCreateCampaign,
  onRetry,
}: {
  state: CampaignDirectoryState;
  onCreateCampaign: () => void;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div role="status" className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600">
        Loading campaigns...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-3xl border border-rose-200 bg-white px-6 py-10 text-center">
        <p role="alert" className="text-sm text-rose-700">{state.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCw size={15} aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Company campaigns">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Your campaigns</h2>
          <p className="mt-1 text-sm text-slate-600">Campaigns created for your company.</p>
        </div>
        <button
          type="button"
          onClick={onCreateCampaign}
          className="inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]"
        >
          <Plus size={17} aria-hidden="true" />
          Create Campaign
        </button>
      </div>

      {state.campaigns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h3 className="text-lg font-semibold text-slate-900">No campaigns yet</h3>
          <p className="mt-2 text-sm text-slate-600">
            Create a campaign to start building your company&apos;s training program.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {state.campaigns.map((campaign) => (
            <li key={campaign.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold text-slate-900">{campaign.name}</h3>
                  {campaign.description ? (
                    <p className="mt-1 text-sm text-slate-600">{campaign.description}</p>
                  ) : null}
                </div>
                <CampaignStatusBadge status={campaign.status} />
              </div>
              <Link
                href={`/admin/learning-campaigns/${encodeURIComponent(campaign.id)}`}
                className="mt-4 inline-flex min-h-10 items-center rounded-lg px-1 text-sm font-semibold text-[#0b3d91] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
              >
                View Campaign <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Official deadline</dt>
                  <dd className="mt-1 font-medium text-slate-800">{campaign.official_deadline.slice(0, 10)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Learning deadline</dt>
                  <dd className="mt-1 font-medium text-slate-800">{campaign.learning_deadline.slice(0, 10)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Buffer</dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {campaign.buffer_days} {campaign.buffer_days === 1 ? "day" : "days"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CampaignDirectory({
  onCreateCampaign,
}: {
  onCreateCampaign: () => void;
}) {
  const [state, setState] = useState<CampaignDirectoryState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCompanyCampaignRecords(fetch)
      .then((campaigns) => {
        if (active) {
          setState({ status: "loaded", campaigns });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "error", message: loadErrorMessage });
        }
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <CampaignDirectoryView
      state={state}
      onCreateCampaign={onCreateCampaign}
      onRetry={() => {
        setState({ status: "loading" });
        setReloadKey((key) => key + 1);
      }}
    />
  );
}
