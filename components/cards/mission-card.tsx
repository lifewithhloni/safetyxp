import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { getTodaysMission } from "@/services/mission.service";

function formatMissionType(type: string) {
  return type.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

export function MissionCard() {
  const mission = getTodaysMission("emp-001");
  const title = mission ? mission.title : "No mission scheduled for today";
  const subtitle = mission
    ? `${formatMissionType(mission.type)} • ${mission.estimatedMinutes} minutes`
    : "Check back tomorrow for your next learning step.";
  const progress = mission ? (mission.status === "Completed" ? 100 : 12) : 0;

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Today&apos;s mission</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-base text-slate-600">{subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-3 py-2 text-sm font-medium text-[#0b3d91]">
          <Clock3 size={16} />
          {progress}% complete
        </div>
      </div>

      <div className="mt-8 rounded-[24px] bg-[#f7f9fc] p-5">
        <p className="text-sm font-medium text-slate-500">Your next step</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">
          {mission
            ? "Review the essentials and finish the mission in one calm pass."
            : "We’ll have a fresh mission ready for you soon."}
        </p>
        <div className="mt-4 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-[#0b3d91]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">One clear action. No extra decisions.</p>
        <Link
          href="/lesson"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]"
        >
          Continue
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
