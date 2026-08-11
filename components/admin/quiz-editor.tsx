"use client";

import { motion } from "framer-motion";
import { PenLine, Sparkles, Plus, Eye, Trash2 } from "lucide-react";
import type { QuizQuestion } from "@/types/content-studio";

type QuizEditorProps = {
  questions: QuizQuestion[];
};

export function QuizEditor({ questions }: QuizEditorProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Quiz</h3>
          <p className="mt-1 text-sm text-slate-600">Review the knowledge checks and refine the challenge level before publishing.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Plus className="h-4 w-4" /> Add question</button>
      </div>

      <div className="mt-6 space-y-4">
        {questions.map((question) => (
          <div key={question.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{question.question}</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  {question.options.map((option) => (
                    <div key={option} className={`rounded-2xl px-3 py-2 ${option === question.correctAnswer ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-600"}`}>
                      {option}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="rounded-full bg-[#eff5ff] px-3 py-1 font-semibold text-[#0b3d91]">{question.difficulty}</div>
                <div className="mt-2 text-slate-500">{question.xp} XP</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><PenLine className="h-4 w-4" /> Edit</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Trash2 className="h-4 w-4" /> Delete</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4" /> Regenerate</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Eye className="h-4 w-4" /> Preview</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
