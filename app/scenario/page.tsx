"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ScenarioForm } from "@/components/forms/scenario-form";
import { ArrowRight } from "lucide-react";

export default function ScenarioPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppShell title="Scenario" description="Apply the right response">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="rounded-[24px] border border-slate-200 bg-[#eef4ff] p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Scenario</p>
          <p className="mt-2 text-sm text-slate-600">Stay calm and choose the safest action.</p>
        </div>

        <div className="mt-6">
          <ScenarioForm />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 rounded-[20px] bg-[#f7f9fc] px-4 py-4 text-sm text-slate-600">
          <span>+150 XP awarded</span>
          <Link
            href="/mission-complete"
            className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white transition ${
              selected ? "bg-[#0b3d91] hover:bg-[#083069]" : "cursor-not-allowed bg-slate-300"
            }`}
          >
            Next
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
