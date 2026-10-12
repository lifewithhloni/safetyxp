"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CampaignAssignmentData,
  CampaignAssignedParticipant,
  CampaignEligibleEmployee,
} from "@/services/admin/campaign-management.service";

type AssignmentResult = CampaignAssignmentData & {
  newlyAssignedEmployeeIds: string[];
  alreadyAssignedEmployeeIds: string[];
};

function isEmployee(value: unknown): value is CampaignEligibleEmployee {
  if (typeof value !== "object" || value === null) return false;
  const employee = value as Record<string, unknown>;
  return typeof employee.id === "string" &&
    typeof employee.first_name === "string" &&
    typeof employee.last_name === "string" &&
    typeof employee.email === "string" &&
    (typeof employee.employee_number === "string" || employee.employee_number === null);
}

function isParticipant(value: unknown): value is CampaignAssignedParticipant {
  if (typeof value !== "object" || value === null) return false;
  const participant = value as Record<string, unknown>;
  return typeof participant.id === "string" &&
    typeof participant.campaign_id === "string" &&
    typeof participant.employee_id === "string" &&
    typeof participant.assigned_at === "string" &&
    typeof participant.status === "string" &&
    typeof participant.completion_percentage === "number" &&
    (typeof participant.completed_at === "string" || participant.completed_at === null) &&
    isEmployee(participant.employee);
}

function isAssignmentData(value: unknown): value is CampaignAssignmentData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return Array.isArray(data.eligibleEmployees) &&
    data.eligibleEmployees.every(isEmployee) &&
    Array.isArray(data.participants) &&
    data.participants.every(isParticipant);
}

async function fetchCampaignAssignmentData(campaignId: string, fetcher: typeof fetch) {
  const response = await fetcher(
    `/api/admin/campaigns/${encodeURIComponent(campaignId)}/assignments`,
    { method: "GET" }
  );
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || !isAssignmentData(result)) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "Assignments could not be loaded. Please try again.";
    throw new Error(message);
  }
  return result;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function submitCampaignAssignments({
  campaignId,
  employeeIds,
  fetcher,
  onData,
  onMessage,
}: {
  campaignId: string;
  employeeIds: string[];
  fetcher: typeof fetch;
  onData: (data: CampaignAssignmentData) => void;
  onMessage: (message: string) => void;
}): Promise<void> {
  try {
    const response = await fetcher(
      `/api/admin/campaigns/${encodeURIComponent(campaignId)}/assignments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds }),
      }
    );
    const result: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "string"
          ? result.error
          : "Assignments could not be saved. Please try again.";
      if (response.status >= 500) {
        try {
          onData(await fetchCampaignAssignmentData(campaignId, fetcher));
          onMessage(`${message} Current assignments have been refreshed; review them before retrying.`);
          return;
        } catch {
          onMessage(`${message} Refresh the page before retrying.`);
          return;
        }
      }
      onMessage(message);
      return;
    }

    if (!isAssignmentData(result)) {
      onMessage("The assignment response was incomplete. Refresh to check the saved assignments.");
      return;
    }

    onData(result);
    const assignmentResult = result as AssignmentResult;
    const messages: string[] = [];
    if (assignmentResult.newlyAssignedEmployeeIds.length > 0) {
      messages.push(`${assignmentResult.newlyAssignedEmployeeIds.length} employee(s) assigned.`);
    }
    if (assignmentResult.alreadyAssignedEmployeeIds.length > 0) {
      messages.push(`${assignmentResult.alreadyAssignedEmployeeIds.length} were already assigned.`);
    }
    onMessage(messages.join(" ") || "Assignments are up to date.");
  } catch {
    try {
      const refreshedData = await fetchCampaignAssignmentData(campaignId, fetcher);
      onData(refreshedData);
      onMessage("The connection was interrupted. Current assignments have been refreshed; check them before retrying.");
    } catch {
      onMessage("The request outcome could not be confirmed. Check your connection and refresh before retrying.");
    }
  }
}

function employeeName(employee: Pick<CampaignEligibleEmployee, "first_name" | "last_name">) {
  return `${employee.first_name} ${employee.last_name}`.trim();
}

function ParticipantList({ participants }: { participants: CampaignAssignedParticipant[] }) {
  if (participants.length === 0) {
    return <p className="px-5 py-6 text-sm text-slate-600">No employees have been assigned to this campaign yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {participants.map((participant) => (
        <li key={participant.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{employeeName(participant.employee)}</p>
            <p className="mt-0.5 break-all text-sm text-slate-600">{participant.employee.email}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold capitalize text-blue-800">
              {participant.status.replace(/_/g, " ")}
            </span>
            <p className="mt-1 text-xs text-slate-500">Assigned {formatDate(participant.assigned_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CampaignAssignmentPanel({
  data,
  isLoading,
  loadError,
  isSaving,
  message,
  isError,
  selectedIds,
  onRetry,
  onSubmit,
  onEmployeeToggle,
}: {
  data: CampaignAssignmentData | null;
  isLoading: boolean;
  loadError: string;
  isSaving: boolean;
  message: string;
  isError: boolean;
  selectedIds: string[];
  onRetry: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onEmployeeToggle: (employeeId: string, checked: boolean) => void;
}) {
  return (
    <section aria-labelledby="campaign-assignments-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h3 id="campaign-assignments-heading" className="font-semibold text-slate-950">Employee assignments</h3>
        <p className="mt-1 text-sm text-slate-600">Assign this campaign to employees in your company.</p>
      </div>

      {isLoading ? (
        <p role="status" className="px-5 py-7 text-sm text-slate-600">Loading employees and assignments…</p>
      ) : loadError ? (
        <div className="space-y-3 border-b border-slate-200 bg-rose-50 p-5 sm:p-6">
          <p role="alert" className="text-sm text-rose-800">{loadError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-10 rounded-lg border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-800 hover:bg-rose-100"
          >
            Retry loading assignments
          </button>
        </div>
      ) : data ? (
        <>
          <form onSubmit={onSubmit} className="space-y-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:p-6">
            {data.eligibleEmployees.length === 0 ? (
              <p className="text-sm text-slate-600">No unassigned employees are available for this campaign.</p>
            ) : (
              <>
                <fieldset disabled={isSaving} className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold text-slate-800">Eligible employees</legend>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.eligibleEmployees.map((employee) => (
                      <li key={employee.id}>
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(employee.id)}
                            onChange={(event) => onEmployeeToggle(employee.id, event.target.checked)}
                            className="size-4 accent-[#0b3d91]"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-900">{employeeName(employee)}</span>
                            <span className="block break-all text-slate-600">{employee.email}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                <button
                  type="submit"
                  disabled={isSaving || selectedIds.length === 0}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b3d91] px-5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Assigning..." : "Assign selected"}
                </button>
              </>
            )}
            {isSaving ? <p role="status" className="text-sm text-slate-600">Saving assignments…</p> : null}
            {message ? (
              <p role={isError ? "alert" : "status"} className={`text-sm ${isError ? "text-rose-700" : "text-emerald-800"}`}>
                {message}
              </p>
            ) : null}
          </form>

          <div>
            <h4 className="px-5 pt-5 font-semibold text-slate-950 sm:px-6">Assigned employees</h4>
            <ParticipantList participants={data.participants} />
          </div>
        </>
      ) : null}
    </section>
  );
}

export function CampaignAssignmentManager({
  campaignId,
}: {
  campaignId: string;
}) {
  const [data, setData] = useState<CampaignAssignmentData | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const savingRef = useRef(false);

  const loadAssignments = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setData(await fetchCampaignAssignmentData(campaignId, fetch));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Assignments could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    let active = true;
    void fetchCampaignAssignmentData(campaignId, fetch)
      .then((nextData) => {
        if (active) {
          setData(nextData);
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Assignments could not be loaded. Please try again."
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    if (selectedIds.length === 0) {
      setIsError(true);
      setMessage("Select one or more employees to assign.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setMessage("");
    setIsError(false);
    await submitCampaignAssignments({
      campaignId,
      employeeIds: selectedIds,
      fetcher: fetch,
      onData: (nextData) => {
        setData(nextData);
        setSelectedIds([]);
      },
      onMessage: (nextMessage) => {
        setMessage(nextMessage);
        setIsError(!nextMessage.includes("assigned.") && !nextMessage.includes("up to date"));
      },
    });
    savingRef.current = false;
    setIsSaving(false);
  }

  return (
    <CampaignAssignmentPanel
      data={data}
      isLoading={isLoading}
      loadError={loadError}
      isSaving={isSaving}
      message={message}
      isError={isError}
      selectedIds={selectedIds}
      onRetry={() => void loadAssignments()}
      onSubmit={handleSubmit}
      onEmployeeToggle={(employeeId, checked) => {
        setSelectedIds((current) =>
          checked
            ? current.includes(employeeId) ? current : [...current, employeeId]
            : current.filter((id) => id !== employeeId)
        );
      }}
    />
  );
}
