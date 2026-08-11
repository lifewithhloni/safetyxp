"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";

export function SuccessScreen({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-3xl font-semibold text-slate-900">Campaign published</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">Employees will automatically receive one learning mission per day until completion.</p>
        <button type="button" onClick={onReturn} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white">
          Return to dashboard
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
