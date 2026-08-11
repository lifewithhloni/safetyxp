"use client";

export function WizardHeader({ currentStep }: { currentStep: number }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#0b3d91]">Sprint 2</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Create Learning Campaign</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Upload a policy and let AI create an engaging learning experience for your employees.</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
          Step {currentStep} of 6
        </div>
      </div>
    </div>
  );
}
