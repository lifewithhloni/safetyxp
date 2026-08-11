import { getMissionProgress } from "@/services/progress.service";

export function ComplianceCard() {
  const mission = getMissionProgress();

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Compliance</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{mission.score}%</p>
      <p className="mt-2 text-sm text-slate-500">Current compliance score</p>
    </div>
  );
}
