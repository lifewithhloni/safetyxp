import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { CheckCircle2, Home } from "lucide-react";

export default function MissionCompletePage() {
  return (
    <AppShell title="Mission complete" description="Your day is done">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eef4ff] text-[#0b3d91]">
          <CheckCircle2 size={36} />
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Today&apos;s mission complete</h2>
        <p className="mt-4 text-base leading-8 text-slate-600">
          Compliance updated. Your response is recorded. You are ready for the next mission.
        </p>
        <Link
          href="/today"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]"
        >
          <Home size={16} />
          Return home
        </Link>
      </div>
    </AppShell>
  );
}
