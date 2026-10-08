import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";

export default function EmployeesLoading() {
  return (
    <AdminShell title="Employees" description="Company employee directory." breadcrumb={["Admin", "Employees"]}>
      <PageContainer>
      <div aria-label="Loading employees" className="space-y-5">
        <div className="h-20 animate-pulse rounded-3xl bg-white shadow-sm" />
        <div className="h-20 animate-pulse rounded-3xl bg-white shadow-sm" />
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-12 border-b border-slate-100 bg-slate-50" />
          <div className="space-y-0 divide-y divide-slate-100">
            {[0, 1, 2, 3].map((row) => <div key={row} className="h-16 animate-pulse bg-white" />)}
          </div>
        </div>
      </div>
      </PageContainer>
    </AdminShell>
  );
}
