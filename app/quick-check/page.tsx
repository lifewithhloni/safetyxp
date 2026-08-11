"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { QuizForm } from "@/components/forms/quiz-form";
import { ArrowRight } from "lucide-react";

export default function QuickCheckPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppShell title="Quick check" description="Answer the one question">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Step 2</p>
        <p className="mt-2 text-sm text-slate-500">Choose the best answer.</p>
        <div className="mt-6">
          <QuizForm />
        </div>

        <div className="mt-8 flex justify-end">
          <Link
            href="/scenario"
            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition ${
              selected ? "bg-[#0b3d91] hover:bg-[#083069]" : "cursor-not-allowed bg-slate-300"
            }`}
          >
            Continue
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
