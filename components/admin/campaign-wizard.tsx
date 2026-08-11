"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { initialCampaignDraft } from "@/services/campaign";
import { WizardHeader } from "@/components/admin/wizard-header";
import { StepIndicator } from "@/components/admin/step-indicator";
import { UploadCard } from "@/components/admin/upload-card";
import { AssignmentMethodCard } from "@/components/admin/assignment-method-card";
import { DepartmentSelector } from "@/components/admin/department-selector";
import { CSVUploader } from "@/components/admin/csv-uploader";
import { CSVPreviewTable } from "@/components/admin/csv-preview-table";
import { DeadlinePicker } from "@/components/admin/deadline-picker";
import { AILearningPlanner } from "@/components/admin/ai-learning-planner";
import { ReviewTabs } from "@/components/admin/review-tabs";
import { CampaignSummary } from "@/components/admin/campaign-summary";
import { SuccessScreen } from "@/components/admin/success-screen";
import type { CampaignStep, CsvEmployeeRow, UploadedDocument } from "@/types/campaign";
import { mockDepartments, mockCsvEmployees } from "@/services/campaign";

export function CampaignWizard() {
  const [step, setStep] = useState<CampaignStep>(1);
  const [draft, setDraft] = useState(initialCampaignDraft);
  const [published, setPublished] = useState(false);

  const selectedEmployeeCount = useMemo(() => {
    if (draft.selectedMethod === "company") return 248;
    if (draft.selectedMethod === "departments") {
      return draft.selectedDepartments.reduce((total, id) => {
        const department = mockDepartments.find((item) => item.id === id);
        return total + (department?.employees ?? 0);
      }, 0);
    }
    return draft.importedEmployees.length;
  }, [draft.importedEmployees.length, draft.selectedDepartments, draft.selectedMethod]);

  const handleFileSelected = (file: File) => {
    const nextDocument: UploadedDocument = {
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      pages: 42,
      readingTime: "18 min",
    };
    setDraft((current) => ({ ...current, uploadedDocument: nextDocument }));
  };

  const handleCsvSelected = (file: File) => {
    setDraft((current) => ({ ...current, importedEmployees: mockCsvEmployees, selectedMethod: "csv" }));
  };

  const handleDepartmentChange = (next: string[]) => {
    setDraft((current) => ({ ...current, selectedDepartments: next, selectedMethod: "departments" }));
  };

  const goNext = () => setStep((current) => (current < 6 ? ((current + 1) as CampaignStep) : current));
  const goBack = () => setStep((current) => (current > 1 ? ((current - 1) as CampaignStep) : current));

  const stepContent = (() => {
    switch (step) {
      case 1:
        return (
          <UploadCard
            document={draft.uploadedDocument}
            onFileSelect={handleFileSelected}
            onContinue={goNext}
          />
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <AssignmentMethodCard title="Entire Company" description="Assign this campaign to every employee." icon="company" selected={draft.selectedMethod === "company"} onSelect={() => setDraft((current) => ({ ...current, selectedMethod: "company" }))} />
              <AssignmentMethodCard title="Departments" description="Assign to one or multiple departments." icon="departments" selected={draft.selectedMethod === "departments"} onSelect={() => setDraft((current) => ({ ...current, selectedMethod: "departments" }))} badge="Searchable">
                {draft.selectedMethod === "departments" ? <DepartmentSelector departments={mockDepartments} selectedDepartments={draft.selectedDepartments} onChange={handleDepartmentChange} /> : null}
              </AssignmentMethodCard>
              <AssignmentMethodCard title="Import CSV" description="Upload a CSV exported from your HR system." icon="csv" selected={draft.selectedMethod === "csv"} onSelect={() => setDraft((current) => ({ ...current, selectedMethod: "csv" }))} badge="CSV">
                {draft.selectedMethod === "csv" ? <CSVUploader onFileSelect={handleCsvSelected} /> : null}
              </AssignmentMethodCard>
            </div>
            {draft.selectedMethod === "csv" ? <CSVPreviewTable employees={draft.importedEmployees as any} /> : null}
            <div className="flex justify-end">
              <button type="button" onClick={goNext} className="rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white">Continue</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <DeadlinePicker value={draft.deadline} onChange={(value) => setDraft((current) => ({ ...current, deadline: value }))} />
            <div className="flex justify-between gap-3">
              <button type="button" onClick={goBack} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Previous</button>
              <button type="button" onClick={goNext} className="rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white">Continue</button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <AILearningPlanner planner={draft.planner} />
            <div className="flex justify-between gap-3">
              <button type="button" onClick={goBack} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Previous</button>
              <button type="button" onClick={goNext} className="rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white">Continue</button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <ReviewTabs content={draft.content} />
            <div className="flex justify-between gap-3">
              <button type="button" onClick={goBack} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Previous</button>
              <button type="button" onClick={goNext} className="rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white">Continue</button>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <CampaignSummary draft={draft} selectedEmployeeCount={selectedEmployeeCount} />
            <div className="flex justify-between gap-3">
              <button type="button" onClick={goBack} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Previous</button>
              <div className="flex gap-3">
                <button type="button" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Save Draft</button>
                <button type="button" onClick={() => setPublished(true)} className="rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white">Publish Campaign</button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  })();

  if (published) {
    return <SuccessScreen onReturn={() => setPublished(false)} />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <WizardHeader currentStep={step} />
      <StepIndicator currentStep={step} />
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="mt-8">
          {stepContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
