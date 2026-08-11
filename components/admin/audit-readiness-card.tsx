"use client";

import { motion } from "framer-motion";
import type { AuditMetric } from "@/types/reports";

export function AuditReadinessCard({ metrics }: { metrics: AuditMetric[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 text-[#0b3d91]">
        <div className="rounded-2xl bg-[#0b3d91] p-2 text-white">
          <span className="text-sm font-semibold">Audit</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Audit readiness</h3>
          <p className="text-sm text-slate-500">Organisational preparedness for the next compliance review.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
            <p className="mt-2 text-sm text-slate-600">{metric.description}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
