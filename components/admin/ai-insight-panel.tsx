"use client";

import { motion } from "framer-motion";
import type { AIInsight } from "@/types/reports";

export function AIInsightPanel({ insights }: { insights: AIInsight[] }) {
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 text-[#0b3d91]">
        <div className="rounded-2xl bg-[#0b3d91] p-2 text-white">
          <span className="text-sm font-semibold">AI</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">AI compliance intelligence</h3>
          <p className="text-sm text-slate-500">Predictions and recommended actions for compliance.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{insight.summary}</p>
            <p className="mt-2 text-sm text-slate-600">{insight.recommendation}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
