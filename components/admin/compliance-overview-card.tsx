"use client";

import { motion } from "framer-motion";

type ComplianceOverviewCardProps = {
  compliance: number;
  trend: number;
  target: number;
  narrative: string;
};

export function ComplianceOverviewCard({ compliance, trend, target, narrative }: ComplianceOverviewCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b3d91]">Compliance overview</p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">Current organisation compliance</h3>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-3xl bg-slate-50 p-4 text-slate-700 sm:flex-row sm:items-center">
          <div className="text-4xl font-semibold text-slate-900">{compliance}%</div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Trend +{trend}%</div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Target {target}%</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 rounded-[24px] border border-slate-200 bg-[#0b3d91] p-6 text-white">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-blue-100">Health status</p>
          <p className="mt-4 text-lg leading-7">{narrative}</p>
        </div>
        <div className="w-full max-w-xs rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-center">
          <div className="relative mx-auto h-40 w-40">
            <div className="absolute inset-0 rounded-full border-8 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-8 border-[#0b3d91]" style={{ clipPath: `inset(${100 - compliance}% 0 0 0)` }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl font-semibold text-slate-900">{compliance}%</div>
          </div>
          <p className="mt-4 text-sm text-slate-600">Current organisation-wide compliance rate</p>
        </div>
      </div>
    </motion.div>
  );
}
