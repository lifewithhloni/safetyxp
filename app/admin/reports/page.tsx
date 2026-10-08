"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";
import { SectionHeader } from "@/components/admin/section-header";
import { reportFilterOptions, defaultReportFilters, reportKpis, complianceOverview, departmentPerformance, campaignPerformance, attentionEmployees, certificateStatus, aiInsights, forecastPoints, auditMetrics } from "@/services/reports";
import { ReportFilters } from "@/components/admin/report-filters";
import { ComplianceOverviewCard } from "@/components/admin/compliance-overview-card";
import { DepartmentCard } from "@/components/admin/department-card";
import { CampaignTable } from "@/components/admin/campaign-table";
import { EmployeeAttentionTable } from "@/components/admin/employee-attention-table";
import { CertificateStatusCard } from "@/components/admin/certificate-status-card";
import { AIInsightPanel } from "@/components/admin/ai-insight-panel";
import { ForecastChart } from "@/components/admin/forecast-chart";
import { AuditReadinessCard } from "@/components/admin/audit-readiness-card";
import { ExportDialog } from "@/components/admin/export-dialog";
import { motion } from "framer-motion";

export default function ReportsPage() {
  const [filters, setFilters] = useState(defaultReportFilters);
  const [showExport, setShowExport] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const filteredDepartments = useMemo(() => departmentPerformance, [filters]);
  const filteredCampaigns = useMemo(() => campaignPerformance, [filters]);
  const filteredAttentionEmployees = useMemo(() => attentionEmployees, [filters]);

  const handleFilterChange = (value: Partial<typeof filters>) => {
    setFilters((current) => ({ ...current, ...value }));
  };

  return (
    <AdminShell title="Reports & Analytics" description="Monitor compliance across your organisation." breadcrumb={["Admin", "Reports & Analytics"]}>
      <PageContainer>
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#315a12]">Reports & Analytics</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#102a43] sm:text-4xl">Reports & Analytics</h1>
          <p className="max-w-2xl text-sm text-slate-600">Monitor compliance across your organisation.</p>
        </div>

        <div className="space-y-6">
          <ReportFilters filters={filters} options={reportFilterOptions} onChange={handleFilterChange} onExport={() => setShowExport(true)} />

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 xl:grid-cols-3">
            {reportKpis.map((metric) => (
              <div key={metric.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{metric.title}</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
                  </div>
                  <div className={`rounded-full p-2 ${metric.trend === "up" ? "bg-emerald-50 text-emerald-700" : metric.trend === "down" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                    <span className="text-sm font-semibold">{metric.change}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600">{metric.description}</p>
              </div>
            ))}
          </motion.div>

          <ComplianceOverviewCard {...complianceOverview} />

          <section className="space-y-4">
            <SectionHeader title="Department performance" subtitle="Which departments are falling behind?" />
            <div className="grid gap-4 xl:grid-cols-3">
              {filteredDepartments.map((department) => (
                <DepartmentCard key={department.id} department={department} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="Campaign performance" subtitle="Which campaigns are at risk?" />
            <CampaignTable campaigns={filteredCampaigns} />
          </section>

          <section className="space-y-4">
            <SectionHeader title="Employees requiring attention" subtitle="Who needs intervention next?" />
            <EmployeeAttentionTable employees={filteredAttentionEmployees} />
          </section>

          <section className="space-y-4">
            <SectionHeader title="Certificate status" subtitle="What certificates expire soon?" />
            <div className="grid gap-4 lg:grid-cols-3">
              {certificateStatus.map((certificate) => (
                <CertificateStatusCard key={certificate.id} certificate={certificate} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className="inline-flex items-center justify-center rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]">Download all</button>
              <p className="text-sm text-slate-500">Download a consolidated certificate status export for renewal planning.</p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <AIInsightPanel insights={aiInsights} />
            <ForecastChart points={forecastPoints} />
          </section>

          <AuditReadinessCard metrics={auditMetrics} />
        </div>
      </PageContainer>

      <ExportDialog open={showExport} onClose={() => setShowExport(false)} />
    </AdminShell>
  );
}
