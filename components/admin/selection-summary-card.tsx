"use client";

import { Users, Building2, TrendingUp } from "lucide-react";

type SelectionSummaryCardProps = {
  selectedCount: number;
  departments: string[];
  completionRate: number;
};

export function SelectionSummaryCard({ selectedCount, departments, completionRate }: SelectionSummaryCardProps) {
  return (
    <aside className="sticky top-6 rounded-3xl border border-slate-200 bg-[#0b3d91] p-6 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Selected employees</h3>
      </div>
      <div className="mt-6 text-4xl font-semibold">{selectedCount}</div>
      <p className="mt-2 text-sm text-blue-100">Employees selected for this campaign</p>

      <div className="mt-6 rounded-2xl bg-white/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-50">
          <Building2 className="h-4 w-4" />
          Departments
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {departments.map((department) => (
            <span key={department} className="rounded-full bg-white/15 px-3 py-1 text-sm text-blue-50">
              {department}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-blue-50">
          <TrendingUp className="h-4 w-4" />
          Estimated completion
        </div>
        <div className="mt-3 text-3xl font-semibold">{completionRate}%</div>
      </div>
    </aside>
  );
}
