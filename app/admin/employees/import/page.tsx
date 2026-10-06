"use client";

import { useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";

export default function AdminEmployeeImportPage() {
  const [fileName, setFileName] = useState("");

  return (
    <AdminShell title="Employee Import" description="Upload a CSV and validate employees before importing." breadcrumb={["Admin", "Employees", "Import"]}>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b3d91]">Step 1</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">Upload CSV</h2>
          <p className="mt-2 text-sm text-slate-600">Supported file type: CSV. Download the template to prepare your new hires.</p>

          <div className="mt-6 rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              id="csv-import-input"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
            <label htmlFor="csv-import-input" className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#0b3d91] px-4 py-2.5 text-sm font-semibold text-white">
              Choose CSV File
            </label>
            <p className="mt-4 text-sm text-slate-600">{fileName ? `Selected: ${fileName}` : "No file selected yet"}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Download CSV Template</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
