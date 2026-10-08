"use client";

import { motion } from "framer-motion";
import type { AIInsight } from "@/types/reports";

export function AIInsightPanel({ insights }: { insights: AIInsight[] }) {
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3 text-[#315a12]">
        <div className="rounded-xl bg-[#f0f8e4] p-2 text-[#315a12]">
          <span className="text-sm font-semibold">AI</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#102a43]">AI compliance intelligence</h3>
          <p className="text-sm text-slate-500">Predictions and recommended actions for compliance.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {insights.map((insight) => (
          <div key={insight.id} className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4">
            <p className="font-semibold text-[#102a43]">{insight.summary}</p>
            <p className="mt-2 text-sm text-slate-600">{insight.recommendation}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
