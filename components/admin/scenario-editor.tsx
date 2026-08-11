"use client";

import { motion } from "framer-motion";
import { PenLine, Sparkles, Eye } from "lucide-react";
import type { ScenarioItem } from "@/types/content-studio";

type ScenarioEditorProps = {
  scenarios: ScenarioItem[];
};

export function ScenarioEditor({ scenarios }: ScenarioEditorProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Scenarios</h3>
          <p className="mt-1 text-sm text-slate-600">These realistic workplace situations help employees practise decision-making under pressure.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4" /> Regenerate</button>
      </div>

      <div className="mt-6 space-y-4">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">{scenario.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{scenario.description}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {scenario.options.map((option) => (
                <div key={option} className={`rounded-2xl px-3 py-2 ${option === scenario.correctResponse ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-600"}`}>
                  {option}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Learning outcome</p>
              <p className="mt-1">{scenario.outcome}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><PenLine className="h-4 w-4" /> Edit</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4" /> Regenerate</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Eye className="h-4 w-4" /> Preview</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
