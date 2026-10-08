import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";

export default function EmployeeDetailLoading() {
  return (
    <AdminShell title="Employee" description="Company employee profile." breadcrumb={["Admin", "Employees"]}>
      <PageContainer>
        <div aria-label="Loading employee profile" className="space-y-5">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </PageContainer>
    </AdminShell>
  );
}
