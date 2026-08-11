import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { getLessonContent } from "@/services/policy.service";
import { ArrowRight } from "lucide-react";

export default function LessonPage() {
  const lessonContent = getLessonContent();

  return (
    <AppShell title="Lesson" description="Review the essentials">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Step 1</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{lessonContent.title}</h2>
        <p className="mt-4 text-lg leading-8 text-slate-600">{lessonContent.summary}</p>

        <div className="mt-8 rounded-[24px] bg-[#f7f9fc] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Key point</p>
          <p className="mt-2 text-base leading-7 text-slate-700">{lessonContent.policy}</p>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Takes about 2 minutes</p>
          <Link
            href="/quick-check"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]"
          >
            Continue
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
