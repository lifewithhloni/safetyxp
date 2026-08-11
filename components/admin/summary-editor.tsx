"use client";

import { motion } from "framer-motion";
import { Copy, PenLine, Sparkles, Eye } from "lucide-react";

type SummaryEditorProps = {
  summary: string[];
};

export function SummaryEditor({ summary }: SummaryEditorProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">AI summary</h3>
          <p className="mt-1 text-sm text-slate-600">A concise summary of the policy, its risks, and the high-value learning outcomes.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><PenLine className="h-4 w-4" /> Edit</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4" /> Regenerate</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Copy className="h-4 w-4" /> Copy</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {summary.map((item) => (
          <div key={item} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {item}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[20px] border border-slate-200 bg-[#f9fbff] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Preview employee view</p>
            <p className="mt-1 text-sm text-slate-600">See how the summary will appear in the learner experience.</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-3 py-2 text-sm font-semibold text-white">
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>
    </motion.div>
  );
}
