"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type PreviewModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PreviewModal({ open, onClose }: PreviewModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-3xl rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Employee preview</h3>
                <p className="mt-1 text-sm text-slate-600">A realistic preview of the learner experience after publishing.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 p-5">
              <div className="rounded-[20px] bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b3d91]">Today’s mission</p>
                <h4 className="mt-2 text-2xl font-semibold text-slate-900">Emergency Response Basics</h4>
                <p className="mt-3 text-sm leading-6 text-slate-600">Complete a short lesson, answer a quiz, and review a workplace scenario before the day closes.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
