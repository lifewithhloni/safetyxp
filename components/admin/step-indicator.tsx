"use client";

import { Check } from "lucide-react";

const steps = ["Upload Policy", "Assign Employees", "Choose Deadline", "AI Learning Planner", "Review Content", "Publish"];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const completed = stepNumber < currentStep;
        const active = stepNumber === currentStep;
        return (
          <div key={label} className="flex items-center gap-2 text-sm">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? "bg-[#0b3d91] text-white" : completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {completed ? <Check className="h-4 w-4" /> : stepNumber}
            </div>
            <span className={`font-medium ${active ? "text-slate-900" : completed ? "text-slate-700" : "text-slate-500"}`}>{label}</span>
            {index < steps.length - 1 ? <div className="ml-2 h-px w-4 bg-slate-200 sm:w-6" /> : null}
          </div>
        );
      })}
    </div>
  );
}
