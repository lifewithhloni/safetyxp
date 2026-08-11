"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GripVertical, PenLine, Sparkles, Scissors, Combine, Eye } from "lucide-react";
import type { LessonItem } from "@/types/content-studio";

type LessonEditorProps = {
  lessons: LessonItem[];
};

export function LessonEditor({ lessons }: LessonEditorProps) {
  const [items, setItems] = useState(lessons);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Lessons</h3>
          <p className="mt-1 text-sm text-slate-600">AI has broken the policy into digestible lessons. Rearrange or refine them as needed.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4" /> Regenerate</button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {items.map((lesson) => (
          <div key={lesson.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white p-2 text-slate-500 shadow-sm"><GripVertical className="h-4 w-4" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{lesson.title}</p>
                    <span className="rounded-full bg-[#eff5ff] px-2.5 py-1 text-xs font-semibold text-[#0b3d91]">{lesson.category}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{lesson.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">{lesson.duration}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><PenLine className="h-4 w-4" /> Edit</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Scissors className="h-4 w-4" /> Split</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Combine className="h-4 w-4" /> Merge</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Eye className="h-4 w-4" /> Preview</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
