"use client";

import type { CampaignPerformance } from "@/types/reports";
import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

export function CampaignTable({ campaigns }: { campaigns: CampaignPerformance[] }) {
  const riskClasses = {
    Low: "bg-emerald-50 text-emerald-700",
    Medium: "bg-amber-50 text-amber-700",
    High: "bg-rose-50 text-rose-700",
  } as const;

  const riskIcons = {
    Low: CheckCircle2,
    Medium: ShieldCheck,
    High: AlertTriangle,
  } as const;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-900">Campaign performance</h3>
        <p className="mt-1 text-sm text-slate-500">Track campaign completion and risk for active programs.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Campaign</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Completion</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employees</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Deadline</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Risk</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {campaigns.map((campaign) => {
              const Icon = riskIcons[campaign.risk];
              return (
                <tr key={campaign.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold text-slate-900">{campaign.campaign}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-2.5 rounded-full bg-[#0b3d91]" style={{ width: `${campaign.completion}%` }} />
                      </div>
                      <span className="text-sm text-slate-600">{campaign.completion}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{campaign.employees}</td>
                  <td className="px-4 py-4 text-slate-600">{campaign.deadline}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${riskClasses[campaign.risk]}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {campaign.risk}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <button type="button" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
                      Manage <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
