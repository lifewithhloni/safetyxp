"use client";

import { motion } from "framer-motion";
import type { DepartmentPerformance } from "@/types/reports";

export function DepartmentCard({ department }: { department: DepartmentPerformance }) {
  const riskClasses = {
    Low: "bg-emerald-50 text-emerald-700",
    Medium: "bg-amber-50 text-amber-700",
    High: "bg-rose-50 text-rose-700",
  } as const;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-[#102a43]">{department.name}</h4>
          <p className="mt-1 text-sm text-slate-500">{department.employees} employees</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskClasses[department.riskLevel]}`}>{department.riskLevel} risk</span>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Compliance</span>
          <span>{department.compliance}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-[#9bdc28]" style={{ width: `${department.compliance}%` }} />
        </div>
      </div>
      <div className="mt-5 grid gap-2 text-sm text-slate-600">
        <div className="rounded-xl bg-[#f4f7fa] p-3">
          <p className="font-semibold text-[#102a43]">Campaign status</p>
          <p className="mt-1">{department.campaignStatus}</p>
        </div>
        <div className="rounded-xl bg-[#f4f7fa] p-3">
          <p className="font-semibold text-[#102a43]">Risk level</p>
          <p className="mt-1">{department.riskLevel}</p>
        </div>
      </div>
    </motion.div>
  );
}
