"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Flag } from "lucide-react";
import { getTodaysMission } from "@/services/mission.service";
import { useAuth } from "@/providers/auth-provider";

function formatMissionType(type: string) {
  return type.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

export function MissionCard() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const mission = !isLoading && user ? getTodaysMission(user.id) : null;

  return (
    <section id="mission" className="scroll-mt-28 overflow-hidden rounded-3xl bg-[#102a43] text-white shadow-[0_16px_50px_rgba(16,42,67,0.14)]">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[#b6eb6f]">
            <Flag size={16} />
            <p className="text-xs font-semibold uppercase tracking-[0.19em]">Today&apos;s safety mission</p>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            {isLoading
              ? "Checking your assigned mission..."
              : mission?.title ?? "No mission details available"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            {isLoading
              ? "Your authenticated learning details are loading."
              : mission?.description ??
                (isAuthenticated
                  ? "You can continue with the available safety learning content below."
                  : "Sign in to view learning assigned to your account.")}
          </p>
          {mission ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100">
                <Clock3 size={14} />
                {formatMissionType(mission.type)} · {mission.estimatedMinutes} min
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100">
                {mission.status}
              </span>
            </div>
          ) : null}
        </div>
        <Link
          href="/lesson"
          className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-[#9bdc28] px-5 py-3 text-sm font-bold text-[#102a43] transition hover:bg-[#b6eb6f] lg:self-center"
        >
          {mission ? "Start mission" : "Open learning"}
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
