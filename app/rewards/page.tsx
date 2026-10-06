"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/providers/auth-provider";
import { ArrowRight, Award, Flame, Sparkles, Star } from "lucide-react";

export default function RewardsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <AppShell title="Rewards" description="Your personal SafetyXP achievements">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-[#102a43] p-6 text-white shadow-[0_16px_50px_rgba(16,42,67,0.14)] sm:p-8">
          <div className="flex items-center gap-3 text-[#b6eb6f]">
            <Sparkles size={18} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Personal achievement centre</p>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Your effort matters.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            This is where your SafetyXP achievements will come together as you learn and complete safety activities.
          </p>
        </section>

        <section aria-labelledby="xp-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
              <Star size={20} />
            </span>
            <div>
              <h2 id="xp-title" className="text-lg font-semibold text-slate-900">Your XP and level</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isLoading
                  ? "Checking your account..."
                  : isAuthenticated && user
                    ? "XP tracking is not available for your account yet. Your total and level will appear here when recorded."
                    : "Sign in to view achievements connected to your account."}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="achievement-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
                <Award size={19} />
              </span>
              <h2 id="achievement-title" className="text-lg font-semibold text-slate-900">Achievements</h2>
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Your achievements will appear here as you complete SafetyXP missions, learning, and safety checks.
            </p>
          </section>

          <section aria-labelledby="streak-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
                <Flame size={19} />
              </span>
              <h2 id="streak-title" className="text-lg font-semibold text-slate-900">Learning streak</h2>
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Streak tracking is not available yet. No streak has been assumed for your account.
            </p>
          </section>
        </div>

        <section className="flex flex-col gap-4 rounded-3xl border border-[#dceac8] bg-[#f7fbf1] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">More rewards are coming</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Keep learning. Your personal rewards view will grow as real achievement tracking becomes available.
            </p>
          </div>
          <Link href="/lesson" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#9bdc28] px-4 py-2.5 text-sm font-semibold text-[#102a43] transition hover:bg-[#b6eb6f]">
            Continue learning
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
