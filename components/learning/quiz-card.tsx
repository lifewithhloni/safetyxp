import { quizQuestion } from "@/lib/mock-data";

export function QuizCard() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Quick check</p>
      <p className="mt-3 text-lg font-semibold text-slate-900">{quizQuestion.prompt}</p>
    </div>
  );
}
