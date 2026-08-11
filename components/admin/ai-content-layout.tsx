"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileQuestion, ShieldAlert, Brain, BadgeCheck } from "lucide-react";
import { mockStudioContent } from "@/services/content-studio";
import { SummaryEditor } from "@/components/admin/summary-editor";
import { LessonEditor } from "@/components/admin/lesson-editor";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { ScenarioEditor } from "@/components/admin/scenario-editor";
import { FlashcardEditor } from "@/components/admin/flashcard-editor";
import { CertificatePreview } from "@/components/admin/certificate-preview";
import { AIInsightsPanel } from "@/components/admin/ai-insights-panel";
import { BottomActionBar } from "@/components/admin/bottom-action-bar";
import { PreviewModal } from "@/components/admin/preview-modal";
import type { StudioTab } from "@/types/content-studio";

const tabs: Array<{ id: StudioTab; label: string; icon: typeof BookOpen }> = [
  { id: "summary", label: "Summary", icon: BookOpen },
  { id: "lessons", label: "Lessons", icon: BookOpen },
  { id: "quiz", label: "Quiz", icon: FileQuestion },
  { id: "scenarios", label: "Scenario", icon: ShieldAlert },
  { id: "flashcards", label: "Flashcards", icon: Brain },
  { id: "certificate", label: "Certificate", icon: BadgeCheck },
];

export function AIContentLayout() {
  const [activeTab, setActiveTab] = useState<StudioTab>("summary");
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.6fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#0b3d91]">
              <BookOpen className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-slate-900">Policy information</h3>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-500">Document name</p>
                <p className="mt-1 font-semibold text-slate-900">Fire Safety Policy.pdf</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-500">Department</p>
                <p className="mt-1 font-semibold text-slate-900">Operations</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-500">Campaign</p>
                <p className="mt-1 font-semibold text-slate-900">Fire Safety Refresh</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-500">Deadline</p>
                <p className="mt-1 font-semibold text-slate-900">30 Sept 2026</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-500">Employees assigned</p>
                <p className="mt-1 font-semibold text-slate-900">248</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-slate-500">Estimated completion</p>
                <p className="mt-1 font-semibold text-slate-900">96%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition ${active ? "bg-[#0b3d91] text-white" : "bg-slate-100 text-slate-700"}`}>
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              {activeTab === "summary" ? <SummaryEditor summary={mockStudioContent.summary} /> : null}
              {activeTab === "lessons" ? <LessonEditor lessons={mockStudioContent.lessons} /> : null}
              {activeTab === "quiz" ? <QuizEditor questions={mockStudioContent.quiz} /> : null}
              {activeTab === "scenarios" ? <ScenarioEditor scenarios={mockStudioContent.scenarios} /> : null}
              {activeTab === "flashcards" ? <FlashcardEditor flashcards={mockStudioContent.flashcards} /> : null}
              {activeTab === "certificate" ? <CertificatePreview /> : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div>
          <AIInsightsPanel />
        </div>
      </div>

      <BottomActionBar onPreview={() => setPreviewOpen(true)} />
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
