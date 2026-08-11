"use client";

import { motion } from "framer-motion";
import { Brain, BookOpen, Clock3, AlertTriangle, TrendingUp } from "lucide-react";

export function AIInsightsPanel() {
  return (
    <motion.aside initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-[#0b3d91]">
        <Brain className="h-5 w-5" />
        <h3 className="text-lg font-semibold text-slate-900">AI insights</h3>
      </div>

      <div className="mt-5 space-y-3 text-sm text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-700">
            <BookOpen className="h-4 w-4" />
            <p className="font-semibold">Document pages</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">42</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Clock3 className="h-4 w-4" />
            <p className="font-semibold">Estimated learning</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">175 minutes</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-4 w-4" />
            <p className="font-semibold">Average daily learning</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">10 minutes</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-700">
            <BookOpen className="h-4 w-4" />
            <p className="font-semibold">Reading difficulty</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">Intermediate</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="font-semibold">Risk areas</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-sm text-slate-700">Working at Heights</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-sm text-slate-700">Emergency Response</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-sm text-slate-700">PPE</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingUp className="h-4 w-4" />
            <p className="font-semibold">Predicted completion</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-slate-900">96%</p>
        </div>
      </div>
    </motion.aside>
  );
}
