"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

type ImportSummaryCardProps = {
  importCount: number;
  departmentCount: number;
  locationCount: number;
  invalidEmailCount: number;
};

export function ImportSummaryCard({
  importCount,
  departmentCount,
  locationCount,
  invalidEmailCount,
}: ImportSummaryCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Import summary</h3>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#f4f8ff] p-4">
          <div className="flex items-center gap-2 text-[#0b3d91]">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-semibold">{importCount} employees imported</span>
          </div>
        </div>
        <div className="rounded-2xl bg-[#f4f8ff] p-4">
          <div className="flex items-center gap-2 text-[#0b3d91]">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-semibold">{departmentCount} departments found</span>
          </div>
        </div>
        <div className="rounded-2xl bg-[#f4f8ff] p-4">
          <div className="flex items-center gap-2 text-[#0b3d91]">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-semibold">{locationCount} locations</span>
          </div>
        </div>
        <div className="rounded-2xl bg-[#fff6ea] p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">{invalidEmailCount} invalid email addresses</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          Review
        </button>
        <button type="button" className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          Remove
        </button>
        <button type="button" className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          Edit
        </button>
        <button type="button" className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
          Retry invalid rows
        </button>
      </div>
    </div>
  );
}
