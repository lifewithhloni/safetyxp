"use client";

import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";
import { DashboardCard } from "@/components/admin/dashboard-card";
import { adminMetrics } from "@/services/admin";

export default function AdminDashboardPage() {
  return (
    <AdminShell title="Admin Dashboard" description="Overview of the learning operations workspace." breadcrumb={["Admin", "Dashboard"]}>
      <PageContainer>
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

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <DashboardCard title="Current priorities" subtitle="High attention items">
            <ul className="space-y-3 text-sm text-slate-600">
              <li>• 14 employees require scheduled follow-up.</li>
              <li>• 3 campaigns are nearing a compliance deadline.</li>
              <li>• 2 certificates are expiring in the next 30 days.</li>
            </ul>
          </DashboardCard>

          <DashboardCard title="System health" subtitle="Workspace status">
            <ul className="space-y-3 text-sm text-slate-600">
              <li>• Authenticated access is active.</li>
              <li>• Company membership is enforced by profile checks.</li>
              <li>• Database access remains company-scoped through RLS.</li>
            </ul>
          </DashboardCard>
        </div>
      </PageContainer>
    </AdminShell>
  );
}
