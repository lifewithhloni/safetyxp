"use client";

import { motion } from "framer-motion";
import { PenLine, Sparkles } from "lucide-react";
import type { FlashcardItem } from "@/types/content-studio";

type FlashcardEditorProps = {
  flashcards: FlashcardItem[];
};

export function FlashcardEditor({ flashcards }: FlashcardEditorProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Flashcards</h3>
          <p className="mt-1 text-sm text-slate-600">Quick recall cards that reinforce high-risk behaviours and recurring policy points.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4" /> Regenerate</button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {flashcards.map((card) => (
          <div key={card.id} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#eff5ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0b3d91]">{card.category}</span>
              <span className="text-sm text-slate-500">{card.difficulty}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">Front</p>
                <p className="mt-1 text-sm text-slate-600">{card.front}</p>
              </div>
              <div className="rounded-2xl bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">Back</p>
                <p className="mt-1 text-sm text-slate-600">{card.back}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><PenLine className="h-4 w-4" /> Edit</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"><Sparkles className="h-4 w-4" /> Regenerate</button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
