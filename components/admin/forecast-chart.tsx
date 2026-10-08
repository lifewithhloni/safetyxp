"use client";

import { motion } from "framer-motion";
import type { ForecastPoint } from "@/types/reports";

export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#102a43]">Compliance forecast</h3>
          <p className="mt-1 text-sm text-slate-500">Projected compliance over the next 30 days.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">30-day view</span>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {points.map((point) => (
            <div key={point.label} className="rounded-3xl bg-white p-4 text-center shadow-sm">
              <p className="text-sm text-slate-500">{point.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#102a43]">{point.compliance}%</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
