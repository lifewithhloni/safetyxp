import { Award, BookOpenCheck, Users } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";
import { getCompanyAdminDashboardData } from "@/services/admin/dashboard.service";

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <span className="rounded-xl bg-[#f0f8e4] p-2.5 text-[#315a12]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-600">{description}</p>
    </article>
  );
}

export default async function AdminDashboardPage() {
  const dashboard = await getCompanyAdminDashboardData();
  const adminName = [dashboard.admin.firstName, dashboard.admin.lastName].filter(Boolean).join(" ");

  return (
    <AdminShell
      title="Admin Dashboard"
      description="Your company overview."
      breadcrumb={["Admin", "Dashboard"]}
    >
      <PageContainer>
        <header className="mb-8">
          <p className="text-sm font-semibold text-[#315a12]">
            Company overview
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#102a43] sm:text-4xl">
            Welcome{adminName ? `, ${adminName}` : ""}
          </h2>
          <p className="mt-2 text-base text-slate-600">{dashboard.company.name}</p>
        </header>

        <section aria-label="Company metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Employees"
            value={dashboard.metrics.employeeCount.toLocaleString()}
            description="Employee profiles in your company"
            icon={Users}
          />
          <MetricCard
            label="Active Campaigns"
            value={dashboard.metrics.activeCampaignCount.toLocaleString()}
            description="Persisted campaigns with active status"
            icon={BookOpenCheck}
          />
          <MetricCard
            label="Certificates Issued"
            value={dashboard.metrics.issuedCertificateCount.toLocaleString()}
            description="Certificates with issued status"
            icon={Award}
          />
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">Completion Rate</p>
            <p className="mt-3 text-lg font-semibold leading-6 text-[#102a43]">
              Not enough training data yet
            </p>
            <p className="mt-4 text-sm text-slate-600">
              A reliable company-wide rate is not available.
            </p>
          </article>
        </section>

      </PageContainer>
    </AdminShell>
  );
}
