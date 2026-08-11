import { scenarioQuestion } from "@/lib/mock-data";

export function ScenarioCard() {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Scenario</p>
      <p className="mt-3 text-lg font-semibold text-slate-900">{scenarioQuestion.prompt}</p>
    </div>
  );
}
