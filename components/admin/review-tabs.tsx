"use client";

import { useState } from "react";
import { Eye, PencilLine, Sparkles, Trash2, RotateCcw } from "lucide-react";
import type { WizardContentItem } from "@/types/campaign";

type ReviewTabsProps = {
  content: WizardContentItem[];
};

const tabs = ["Summary", "Lessons", "Quiz", "Scenario", "Flashcards"] as const;

type TabKey = (typeof tabs)[number];

export function ReviewTabs({ content }: ReviewTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("Summary");

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-full px-3.5 py-2 text-sm font-medium ${activeTab === tab ? "bg-[#0b3d91] text-white" : "bg-slate-100 text-slate-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">{activeTab} review</p>
            <p className="mt-1 text-sm text-slate-600">Review and refine the generated content before publishing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <PencilLine className="h-4 w-4" />
              Edit
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <Sparkles className="h-4 w-4" />
              Regenerate
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {content.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-600"><PencilLine className="h-4 w-4" /></button>
                <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-600"><Trash2 className="h-4 w-4" /></button>
                <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-600"><RotateCcw className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
