"use client";

import { ShieldCheck, Users, Building2, Clock3, Sparkles } from "lucide-react";
import type { CampaignDraft } from "@/types/campaign";

type CampaignSummaryProps = {
  draft: CampaignDraft;
  selectedEmployeeCount: number;
};

export function CampaignSummary({ draft, selectedEmployeeCount }: CampaignSummaryProps) {
  const departments = draft.selectedDepartments.length
    ? draft.selectedDepartments.map((id) => id.charAt(0).toUpperCase() + id.slice(1))
    : ["Entire company"];

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-[#0b3d91]">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="text-xl font-semibold text-slate-900">Campaign summary</h3>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Policy</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{draft.uploadedDocument?.name ?? "No policy uploaded"}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Employees</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{selectedEmployeeCount}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Departments</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {departments.map((department) => (
                <span key={department} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">{department}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Clock3 className="h-4 w-4 text-[#0b3d91]" /> Learning days</div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{draft.planner.availableDays}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Sparkles className="h-4 w-4 text-[#0b3d91]" /> Daily learning</div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{draft.planner.dailyLearning}</p>
          </div>
          <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Users className="h-4 w-4 text-[#0b3d91]" /> Estimated completion</div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">96%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
