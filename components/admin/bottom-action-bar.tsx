"use client";

import { Eye, Save, Sparkles } from "lucide-react";

export function BottomActionBar({ onPreview }: { onPreview: () => void }) {
  return (
    <div className="sticky bottom-4 z-20 mt-8 rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button type="button" onClick={onPreview} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            <Eye className="h-4 w-4" />
            Preview employee journey
          </button>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-5 py-2.5 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4" />
          Publish campaign
        </button>
      </div>
    </div>
  );
}
