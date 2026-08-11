import { getLessonContent } from "@/services/policy.service";

export function LessonCard() {
  const lesson = getLessonContent();

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Lesson</p>
      <p className="mt-3 text-xl font-semibold text-slate-900">{lesson.title}</p>
      <p className="mt-2 text-sm text-slate-500">{lesson.summary}</p>
    </div>
  );
}
