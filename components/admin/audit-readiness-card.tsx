"use client";

import { motion } from "framer-motion";
import type { AuditMetric } from "@/types/reports";

export function AuditReadinessCard({ metrics }: { metrics: AuditMetric[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3 text-[#315a12]">
        <div className="rounded-xl bg-[#f0f8e4] p-2 text-[#315a12]">
          <span className="text-sm font-semibold">Audit</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#102a43]">Audit readiness</h3>
          <p className="text-sm text-slate-500">Organisational preparedness for the next compliance review.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-bold text-[#102a43]">{metric.value}</p>
            <p className="mt-2 text-sm text-slate-600">{metric.description}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
