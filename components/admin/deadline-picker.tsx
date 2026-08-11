"use client";

import { CalendarDays, Clock3, Sparkles } from "lucide-react";

type DeadlinePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DeadlinePicker({ value, onChange }: DeadlinePickerProps) {
  const selectedDate = new Date(value);
  const day = selectedDate.getDate();
  const month = selectedDate.toLocaleDateString("en", { month: "short" });
  const learningEndsDate = new Date(selectedDate);
  learningEndsDate.setDate(selectedDate.getDate() - 2);
  const learningDay = learningEndsDate.getDate();
  const learningMonth = learningEndsDate.toLocaleDateString("en", { month: "short" });

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Completion deadline</h3>
          <p className="mt-2 text-sm text-slate-600">Choose when the campaign should be completed. SafetyXP automatically applies a two-day buffer.</p>
        </div>
        <div className="rounded-full border border-[#0b3d91]/20 bg-[#eff5ff] px-3 py-1 text-sm font-medium text-[#0b3d91]">
          AI Buffer Applied
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4 text-[#0b3d91]" />
            Choose complete by
          </div>
          <input
            type="date"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0b3d91]"
          />
        </div>
        <div className="rounded-[20px] border border-slate-200 bg-[#f9fbff] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Clock3 className="h-4 w-4 text-[#0b3d91]" />
            Buffer summary
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-sm text-slate-500">Campaign deadline</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{day} {month}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-sm text-slate-500">Learning ends</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{learningDay} {learningMonth}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-sm text-slate-500">Buffer</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{learningMonth} {learningDay}–{day} {month}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[20px] border border-slate-200 bg-[#fbfcfe] p-4 text-sm text-slate-600">
        <div className="flex items-center gap-2 text-[#0b3d91]">
          <Sparkles className="h-4 w-4" />
          <span className="font-semibold">This gives employees two catch-up days before the official deadline.</span>
        </div>
      </div>
    </div>
  );
}
