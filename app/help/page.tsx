"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/providers/auth-provider";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CircleHelp,
  FileText,
  Flag,
  LifeBuoy,
  ShieldCheck,
} from "lucide-react";

const quickHelp = [
  {
    title: "How SafetyXP works",
    description: "Start with the available lesson, then continue through the learning activities.",
    href: "/today",
    icon: ShieldCheck,
  },
  {
    title: "How to complete a lesson",
    description: "Open the lesson and use Continue to proceed through its current learning flow.",
    href: "/lesson",
    icon: BookOpenCheck,
  },
  {
    title: "How knowledge checks work",
    description: "Choose an answer in the available check and continue to the next activity.",
    href: "/quick-check",
    icon: CircleHelp,
  },
  {
    title: "How certificates work",
    description: "View certificates issued to your account and access their available actions.",
    href: "/certificates",
    icon: FileText,
  },
  {
    title: "XP and achievements",
    description: "See the current personal rewards information and what tracking is available.",
    href: "/rewards",
    icon: Flag,
  },
];

export default function HelpPage() {
  const { isAuthenticated, isLoading, company } = useAuth();

  return (
    <AppShell title="Help & Support" description="Find help with your SafetyXP workspace">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-[#102a43] p-6 text-white shadow-[0_16px_50px_rgba(16,42,67,0.14)] sm:p-8">
          <div className="flex items-center gap-3 text-[#b6eb6f]">
            <LifeBuoy size={19} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Employee help centre</p>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">How can we help?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Find a quick answer or get guidance about your learning and account.
          </p>
        </section>

        <section aria-labelledby="quick-help-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
              <CircleHelp size={19} />
            </span>
            <h2 id="quick-help-title" className="text-lg font-semibold text-slate-900">Quick help</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickHelp.map(({ title, description, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-20 items-center gap-3 rounded-2xl border border-slate-100 p-4 transition hover:border-[#d4e9b4] hover:bg-[#f8fbf4]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[#315a12]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="company-help-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
                <Building2 size={19} />
              </span>
              <h2 id="company-help-title" className="text-lg font-semibold text-slate-900">Company support</h2>
            </div>
            {isLoading ? (
              <p role="status" className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                Checking your company assignment...
              </p>
            ) : company ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">{company.name}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Contact your company safety/admin team through your organization&apos;s usual channel. Contact details are not available in SafetyXP.
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                You are not currently assigned to a company. Contact your SafetyXP administrator if you need help joining your organization.
              </p>
            )}
          </section>

          <section aria-labelledby="platform-help-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
                <ShieldCheck size={19} />
              </span>
              <h2 id="platform-help-title" className="text-lg font-semibold text-slate-900">SafetyXP support</h2>
            </div>
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {isAuthenticated && company
                ? "For platform issues, ask your company administrator to pass the issue to the SafetyXP support team. An in-app support contact is not configured here."
                : isAuthenticated
                  ? "An official SafetyXP support contact is not configured in this workspace yet. For platform problems, contact your SafetyXP administrator through the channel provided to you."
                  : "Sign in to see help relevant to your account."}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Report a problem directly in SafetyXP is not available yet. No ticket is created from this page.
            </p>
          </section>
        </div>

        <section aria-labelledby="faq-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4dc] text-[#315a12]">
              <CircleHelp size={19} />
            </span>
            <h2 id="faq-title" className="text-lg font-semibold text-slate-900">Frequently asked questions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <details className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                What is a mission?
                <span className="float-right text-slate-400 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                A mission is a safety learning activity presented for you to work through. Assigned mission details appear on Home when available for your account.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                How do I complete a lesson?
                <span className="float-right text-slate-400 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Open My Learning and use Continue to follow the lesson&apos;s available next step.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                Where can I find my certificates?
                <span className="float-right text-slate-400 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Open Certificates to view records issued to your authenticated account.
              </p>
            </details>
            <details className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                Where can I see my progress?
                <span className="float-right text-slate-400 group-open:rotate-90">›</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Home shows the employee progress information currently available. Rewards explains which achievement data is not yet tracked.
              </p>
            </details>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
