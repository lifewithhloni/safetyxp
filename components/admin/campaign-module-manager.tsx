"use client";

import { useRef, useState } from "react";
import type {
  CreateLearningModuleInput,
  LearningModuleRecord,
} from "@/services/admin/campaign-management.service";

export type CampaignModulePayload = CreateLearningModuleInput;

type SaveCampaignModuleDependencies = {
  campaignId: string;
  payload: CampaignModulePayload;
  fetcher: typeof fetch;
  savingRef: { current: boolean };
  onSavingChange: (saving: boolean) => void;
  onCreated: (modules: LearningModuleRecord[]) => void;
  onError: (message: string) => void;
};

function isLearningModuleRecord(value: unknown): value is LearningModuleRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.campaign_id === "string" &&
    typeof record.title === "string" &&
    (typeof record.description === "string" || record.description === null) &&
    (typeof record.content === "string" || record.content === null) &&
    (typeof record.estimated_minutes === "number" || record.estimated_minutes === null) &&
    typeof record.order_index === "number" &&
    typeof record.status === "string" &&
    typeof record.created_at === "string";
}

export async function saveCampaignModule({
  campaignId,
  payload,
  fetcher,
  savingRef,
  onSavingChange,
  onCreated,
  onError,
}: SaveCampaignModuleDependencies) {
  if (savingRef.current) {
    return;
  }

  savingRef.current = true;
  onSavingChange(true);
  onError("");

  try {
    const response = await fetcher(
      `/api/admin/campaigns/${encodeURIComponent(campaignId)}/modules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: [payload] }),
      }
    );
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      const message = typeof result === "object" && result !== null &&
        "error" in result && typeof result.error === "string"
        ? result.error
        : "Learning module could not be saved. Please try again.";
      onError(message);
      return;
    }

    const createdModules = typeof result === "object" && result !== null &&
      "modules" in result && Array.isArray(result.modules) &&
      result.modules.every(isLearningModuleRecord)
      ? result.modules
      : null;

    if (
      !createdModules ||
      createdModules.length !== 1 ||
      createdModules[0]?.campaign_id !== campaignId
    ) {
      onError("The learning module response was incomplete. Please try again.");
      return;
    }

    onCreated(createdModules);
  } catch {
    onError("Learning module could not be saved. Check your connection and try again.");
  } finally {
    savingRef.current = false;
    onSavingChange(false);
  }
}

export function CampaignModuleList({
  modules,
}: {
  modules: LearningModuleRecord[];
}) {
  if (modules.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-slate-600">No learning modules yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {modules.map((module) => (
        <li key={module.id} className="px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-950">{module.title}</h4>
              {module.description ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{module.description}</p>
              ) : null}
            </div>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {module.status}
            </span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Order</dt>
              <dd className="mt-1 text-slate-800">{module.order_index + 1}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated time</dt>
              <dd className="mt-1 text-slate-800">
                {module.estimated_minutes === null ? "—" : `${module.estimated_minutes} minutes`}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Module ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-600">{module.id}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

export function CampaignModuleManager({
  campaignId,
  initialModules,
}: {
  campaignId: string;
  initialModules: LearningModuleRecord[];
}) {
  const [modules, setModules] = useState(initialModules);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError("Enter a title for the learning module.");
      return;
    }

    const parsedMinutes = estimatedMinutes === "" ? null : Number(estimatedMinutes);
    if (
      parsedMinutes !== null &&
      (!Number.isSafeInteger(parsedMinutes) || parsedMinutes < 0)
    ) {
      setError("Estimated minutes must be a non-negative whole number.");
      return;
    }

    const nextOrderIndex = modules.reduce(
      (highest, module) => Math.max(highest, module.order_index),
      -1
    ) + 1;

    await saveCampaignModule({
      campaignId,
      payload: {
        title: normalizedTitle,
        description: description.trim() || null,
        content: content || null,
        estimatedMinutes: parsedMinutes,
        orderIndex: nextOrderIndex,
      },
      fetcher: fetch,
      savingRef,
      onSavingChange: setIsSaving,
      onCreated: (createdModules) => {
        setModules((existing) =>
          [...existing, ...createdModules].sort((left, right) => left.order_index - right.order_index)
        );
        setTitle("");
        setDescription("");
        setContent("");
        setEstimatedMinutes("");
      },
      onError: setError,
    });
  }

  return (
    <section aria-labelledby="campaign-modules-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h3 id="campaign-modules-heading" className="font-semibold text-slate-950">Learning modules</h3>
        <p className="mt-1 text-sm text-slate-600">Draft modules saved to this campaign.</p>
      </div>

      <CampaignModuleList modules={modules} />

      <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6">
        <h4 className="font-semibold text-slate-950">Add Learning Module</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-[#0b3d91]"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0b3d91]"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Estimated minutes
            <input
              type="number"
              min={0}
              step={1}
              value={estimatedMinutes}
              onChange={(event) => setEstimatedMinutes(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-[#0b3d91]"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Content
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0b3d91]"
            />
          </label>
        </div>
        {error ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-[#0b3d91] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#083069] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving module..." : "Add Learning Module"}
          </button>
        </div>
      </form>
    </section>
  );
}
