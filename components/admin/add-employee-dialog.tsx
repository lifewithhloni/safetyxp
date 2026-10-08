"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Plus, UserRoundPlus, X } from "lucide-react";

type Department = { id: string; name: string };
type PreviewRow = {
  rowNumber: number;
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string | null;
    jobTitle: string | null;
    department: string | null;
  };
  errors: string[];
  status: "ready" | "skipped" | "error" | "created";
};
type ImportPreview = {
  rows: PreviewRow[];
  ready: number;
  skipped: number;
  errors: number;
};
type ImportResult = {
  rows: PreviewRow[];
  created: number;
  invitationsQueued: number;
  skipped: number;
  errors: number;
  emailProviderNote: string | null;
};

async function responseError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return "The request could not be completed. Please try again.";
}

export function AddEmployeeDialog({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "csv" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [departmentSelection, setDepartmentSelection] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [manualResult, setManualResult] = useState<{
    invitationQueued: boolean;
    emailProviderNote: string | null;
  } | null>(null);

  function openDialog() {
    setOpen(true);
    setMode(null);
    setError(null);
    setPreview(null);
    setResult(null);
    setManualResult(null);
    setCsvText("");
    setDepartmentSelection("");
  }

  function closeDialog() {
    setOpen(false);
    setMode(null);
    setBusy(false);
    router.refresh();
  }

  async function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          email: data.get("email"),
          employeeNumber: data.get("employeeNumber") || null,
          jobTitle: data.get("jobTitle") || null,
          departmentId: data.get("departmentId") || null,
          ...(data.get("departmentId") === "__create_new_department__"
            ? { newDepartmentName: data.get("newDepartmentName") }
            : {}),
        }),
      });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }

      const body = await response.json() as {
        invitationQueued: boolean;
        emailProviderNote: string | null;
      };
      setManualResult(body);
      router.refresh();
    } catch {
      setError("Employee could not be created. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file. Excel files are not supported.");
      return;
    }
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      setCsvText(await file.text());
    } catch {
      setError("The selected CSV file could not be read.");
    }
  }

  function downloadExampleCsv() {
    const csv = "First Name,Last Name,Email,Employee Number,Job Title,Department";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "SafetyXP-Employee-Import-Template.csv";
    link.setAttribute("aria-label", "Download example employee CSV template");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function handlePreview() {
    setBusy(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const response = await fetch("/api/admin/employees/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }
      setPreview(await response.json() as ImportPreview);
    } catch {
      setError("The CSV preview could not be loaded. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImport() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      if (!response.ok) {
        setError(await responseError(response));
        return;
      }
      setResult(await response.json() as ImportResult);
      router.refresh();
    } catch {
      setError("The CSV import could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#9bdc28] px-5 text-sm font-semibold text-[#102a43] shadow-sm transition hover:bg-[#b6eb6f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a12]"
      >
        <Plus aria-hidden="true" size={18} />
        Add Employee
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#071c2b]/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-employee-heading"
            className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#315a12]">People</p>
                <h2 id="add-employee-heading" className="mt-1 text-2xl font-bold tracking-tight text-[#102a43]">
                  {manualResult || result ? "Employee provisioning result" : mode ? "Add employees" : "Add employees"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Create employee accounts and send invitations to set their passwords.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close employee creation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            {!mode && !manualResult && !result ? (
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className="flex min-h-40 flex-col items-start rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:border-[#9bdc28] hover:bg-[#f8fced]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef7dc] text-[#315a12]">
                    <UserRoundPlus aria-hidden="true" size={21} />
                  </span>
                  <span className="mt-4 font-semibold text-[#102a43]">Add manually</span>
                  <span className="mt-1 text-sm text-slate-600">Create one employee profile and send an invitation.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("csv")}
                  className="flex min-h-40 flex-col items-start rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:border-[#9bdc28] hover:bg-[#f8fced]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#0b3d91]">
                    <FileSpreadsheet aria-hidden="true" size={21} />
                  </span>
                  <span className="mt-4 font-semibold text-[#102a43]">Import CSV</span>
                  <span className="mt-1 text-sm text-slate-600">Review and validate a list before creating any accounts.</span>
                </button>
              </div>
            ) : null}

            {mode === "manual" && !manualResult ? (
              <form onSubmit={handleManualSubmit} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    First name <span aria-hidden="true">*</span>
                    <input name="firstName" autoComplete="given-name" required maxLength={100} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Last name <span aria-hidden="true">*</span>
                    <input name="lastName" autoComplete="family-name" required maxLength={100} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Email <span aria-hidden="true">*</span>
                  <input name="email" type="email" autoComplete="email" required maxLength={320} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Employee number <span className="font-normal text-slate-500">(optional)</span>
                    <input name="employeeNumber" maxLength={100} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20" />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Job title <span className="font-normal text-slate-500">(optional)</span>
                    <input name="jobTitle" maxLength={150} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Department <span className="font-normal text-slate-500">(optional)</span>
                  <select
                    name="departmentId"
                    value={departmentSelection}
                    onChange={(event) => setDepartmentSelection(event.target.value)}
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20"
                  >
                    <option value="">No department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                    <option value="__create_new_department__">+ Create new department</option>
                  </select>
                </label>
                {departmentSelection === "__create_new_department__" ? (
                  <label className="block text-sm font-medium text-slate-700">
                    New department name
                    <input
                      name="newDepartmentName"
                      type="text"
                      placeholder="e.g. Construction & Safety"
                      maxLength={100}
                      required
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20"
                    />
                  </label>
                ) : null}
                {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={() => { setMode(null); setError(null); }} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">Back</button>
                  <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-[#9bdc28] px-5 text-sm font-semibold text-[#102a43] disabled:opacity-60">
                    {busy ? "Creating account..." : "Create employee"}
                  </button>
                </div>
              </form>
            ) : null}

            {mode === "csv" && !result ? (
              <div className="mt-7 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-[#102a43]">Required columns</p>
                  <p className="mt-1 text-sm text-slate-600">First Name, Last Name, Email</p>
                  <p className="mt-2 text-xs text-slate-500">Optional: Employee Number, Job Title, Department. Department values must match a department in your company.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => fileInput.current?.click()} className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">
                    Choose CSV file
                  </button>
                  <button
                    type="button"
                    onClick={downloadExampleCsv}
                    aria-label="Download example employee CSV template"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#90c822]"
                  >
                    <Download aria-hidden="true" size={16} />
                    Download example CSV
                  </button>
                  <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void handleFile(event.target.files?.[0])} />
                  <span className="text-xs text-slate-500">Maximum 500 rows and 2 MB.</span>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Or paste CSV contents
                  <textarea value={csvText} onChange={(event) => { setCsvText(event.target.value); setPreview(null); setResult(null); }} rows={7} spellCheck={false} placeholder={"First Name,Last Name,Email,Employee Number,Job Title,Department\nAri,Jones,ari@example.com,A-100,Technician,Operations"} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs outline-none focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20" />
                </label>
                {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
                {preview ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Count label="Ready" count={preview.ready} color="green" />
                      <Count label="Skipped" count={preview.skipped} color="slate" />
                      <Count label="Errors" count={preview.errors} color="rose" />
                    </div>
                    <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-slate-600">
                          <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Status / issue</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.rows.map((row) => (
                            <tr key={row.rowNumber}>
                              <td className="px-3 py-2">{row.rowNumber}</td>
                              <td className="px-3 py-2">{row.employee.firstName} {row.employee.lastName}<br /><span className="text-slate-500">{row.employee.email}</span></td>
                              <td className="px-3 py-2">
                                {row.status === "ready" ? <span className="font-medium text-[#315a12]">Ready</span> : null}
                                {row.errors.join(" ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={() => { setMode(null); setError(null); }} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700">Back</button>
                  <button type="button" onClick={() => void handlePreview()} disabled={busy || !csvText.trim()} className="min-h-11 rounded-xl border border-[#102a43] px-4 text-sm font-semibold text-[#102a43] disabled:opacity-50">
                    {busy && !preview ? "Validating..." : "Preview import"}
                  </button>
                  {preview ? (
                    <button type="button" onClick={() => void handleImport()} disabled={busy || preview.ready === 0} className="min-h-11 rounded-xl bg-[#9bdc28] px-5 text-sm font-semibold text-[#102a43] disabled:opacity-50">
                      {busy ? "Importing..." : `Import ${preview.ready} ready`}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {manualResult ? (
              <div className="mt-7 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Count label="Successfully created" count={1} color="green" />
                  <Count label="Invitations queued" count={manualResult.invitationQueued ? 1 : 0} color="slate" />
                </div>
                {manualResult.emailProviderNote ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{manualResult.emailProviderNote}</p> : null}
                <p className="text-sm text-slate-600">The employee account and profile are saved and now appear in the company directory.</p>
                <div className="flex justify-end"><button type="button" onClick={closeDialog} className="min-h-11 rounded-xl bg-[#102a43] px-5 text-sm font-semibold text-white">Close</button></div>
              </div>
            ) : null}

            {result ? (
              <div className="mt-7 space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Count label="Successfully created" count={result.created} color="green" />
                  <Count label="Invitations queued" count={result.invitationsQueued} color="slate" />
                  <Count label="Skipped" count={result.skipped} color="slate" />
                  <Count label="Errors" count={result.errors} color="rose" />
                </div>
                {result.emailProviderNote ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{result.emailProviderNote}</p> : null}
                {result.rows.some((row) => row.errors.length > 0) ? (
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200">
                    <ul className="divide-y divide-slate-100 text-sm">
                      {result.rows.filter((row) => row.errors.length > 0).map((row) => (
                        <li key={row.rowNumber} className="px-4 py-3">
                          <span className="font-semibold text-slate-800">Row {row.rowNumber}: </span>
                          <span className="text-slate-600">{row.errors.join(" ")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex justify-end"><button type="button" onClick={closeDialog} className="min-h-11 rounded-xl bg-[#102a43] px-5 text-sm font-semibold text-white">Close</button></div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function Count({ label, count, color }: { label: string; count: number; color: "green" | "slate" | "rose" }) {
  const colors = {
    green: "border-[#dbeabe] bg-[#f8fced] text-[#315a12]",
    slate: "border-slate-200 bg-slate-50 text-[#102a43]",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <div className={`rounded-2xl border p-3 ${colors[color]}`}>
      <p className="text-xl font-bold">{count}</p>
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  );
}
