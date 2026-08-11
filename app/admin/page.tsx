"use client";

import Link from "next/link";
import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";
import { DashboardCard } from "@/components/admin/dashboard-card";
import { adminMetrics } from "@/services/admin";
import { ArrowRight, BarChart3, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

const adminActions = [
  {
    title: "Reports & Analytics",
    description: "Review compliance trends, campaign health, and overdue training.",
    href: "/admin/reports",
    accent: "bg-[#eef4ff] text-[#0b3d91]",
    icon: BarChart3,
  },
  {
    title: "Assign Work",
    description: "Select teams or employees and continue into the campaign setup flow.",
    href: "/admin/assign-employees",
    accent: "bg-[#edfdf5] text-[#0f766e]",
    icon: ClipboardCheck,
  },
  {
    title: "Learning Campaigns",
    description: "Create or review active safety campaigns and learning content.",
    href: "/admin/learning-campaigns",
    accent: "bg-[#fff7ed] text-[#c2410c]",
    icon: FileText,
  },
  {
    title: "Certificates",
    description: "Monitor issuance, expiry cycles, and compliance credentials.",
    href: "/admin/certificates",
    accent: "bg-[#f5f3ff] text-[#6d28d9]",
    icon: ShieldCheck,
  },
];

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Admin" description="Choose a workspace to manage learning, compliance, and assignments." breadcrumb={["Admin", "Overview"]}>
      <PageContainer>
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0b3d91]">Admin workspace</p>
          <h2 className="text-3xl font-semibold text-slate-900">Choose your admin action</h2>
          <p className="text-sm text-slate-600">Start with reporting, assignment, campaign creation, or certificate oversight.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminMetrics.map((metric) => (
            <div key={metric.title} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{metric.title}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
              <p className="mt-4 text-sm text-slate-600">{metric.description}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0b3d91]">{metric.change}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {adminActions.map(({ title, description, href, accent, icon: Icon }) => (
            <Link key={title} href={href} className="group block rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0b3d91]">
                Open
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <DashboardCard title="Admin quick actions" subtitle="Popular next steps">
            <div className="space-y-3">
              <Link href="/admin/reports" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Review organisation reporting</p>
                  <p className="mt-1 text-sm text-slate-500">Check compliance trends and risk.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#0b3d91]" />
              </Link>

              <Link href="/admin/assign-employees" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Assign work to employees</p>
                  <p className="mt-1 text-sm text-slate-500">Go to Step 2 and select the audience.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#0b3d91]" />
              </Link>

              <Link href="/admin/learning-campaigns" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Launch a new campaign</p>
                  <p className="mt-1 text-sm text-slate-500">Create courses, lessons, and quizzes.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#0b3d91]" />
              </Link>
            </div>
          </DashboardCard>

          <DashboardCard title="Admin status" subtitle="Current operating posture">
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Operations health</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">96%</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-700">At-risk employees</p>
                <p className="mt-2 text-2xl font-semibold text-amber-900">14</p>
              </div>
            </div>
          </DashboardCard>
        </div>
      </PageContainer>
    </AdminShell>
  );
}
