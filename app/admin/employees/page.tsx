import Link from "next/link";
import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";
import {
  EmployeeAccessError,
  getCompanyEmployeeDirectory,
  redirectForEmployeeAccessError,
} from "@/services/admin/employee-management.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ErrorState() {
  return (
    <div role="alert" className="rounded-3xl border border-rose-200 bg-white p-5 text-sm text-rose-800 shadow-sm">
      <h2 className="font-semibold">Employees could not be loaded</h2>
      <p className="mt-1">Please try again. Your employee records have not been changed.</p>
    </div>
  );
}

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = (firstParam(params.search) ?? "").slice(0, 100);
  const departmentId = firstParam(params.department) ?? "";

  let directory;
  try {
    directory = await getCompanyEmployeeDirectory({ search, departmentId });
  } catch (error) {
    if (error instanceof EmployeeAccessError) {
      redirectForEmployeeAccessError(error);
    }

    return (
      <AdminShell title="Employees" description="Company employee directory." breadcrumb={["Admin", "Employees"]}>
        <PageContainer><ErrorState /></PageContainer>
      </AdminShell>
    );
  }

  const hasFilters = Boolean(search || departmentId);

  return (
    <AdminShell title="Employees" description="Company employee directory." breadcrumb={["Admin", "Employees"]}>
      <div className="space-y-6">
        <PageContainer>
        <header>
          <p className="text-sm font-semibold text-[#315a12]">People</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#102a43] sm:text-4xl">Employees</h2>
          <p className="mt-2 text-sm text-slate-600">View employee profiles belonging to your company.</p>
        </header>

        <form method="get" className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_240px_auto] sm:items-end sm:p-5">
          <label className="block text-sm font-medium text-slate-700">
            Search employees
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Name, email, or employee number"
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Department
            <select
              name="department"
              defaultValue={departmentId}
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20"
            >
              <option value="">All departments</option>
              {directory.departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="min-h-11 rounded-xl bg-[#9bdc28] px-5 text-sm font-semibold text-[#102a43] transition hover:bg-[#b6eb6f]">
            Apply filters
          </button>
        </form>

        {directory.employees.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-[#102a43]">
              {hasFilters ? "No employees match your filters" : "No employees yet"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              {hasFilters
                ? "Try changing or clearing your search and department filters."
                : "Employees will appear here once they are added to the company."}
            </p>
            {hasFilters && (
              <Link href="/admin/employees" className="mt-4 inline-flex rounded-xl px-3 py-2 text-sm font-semibold text-[#315a12] hover:bg-[#f0f8e4]">
                Clear filters
              </Link>
            )}
          </section>
        ) : (
          <section aria-label="Employee directory" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Company employees</h3>
              <span className="text-sm text-slate-500">{directory.employees.length}</span>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Email</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Department</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Job title</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Employee number</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {directory.employees.map((employee) => (
                    <tr key={employee.id} className="text-slate-700 transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                        <Link href={`/admin/employees/${employee.id}`} className="rounded-sm hover:text-[#315a12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9bdc28]">
                          {employee.firstName} {employee.lastName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">{employee.email}</td>
                      <td className="whitespace-nowrap px-5 py-4">{employee.departmentName ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4">{employee.jobTitle ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4">{employee.employeeNumber ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(employee.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-200 md:hidden">
              {directory.employees.map((employee) => (
                <li key={employee.id} className="p-4">
                  <Link href={`/admin/employees/${employee.id}`} className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9bdc28]">
                    <span className="block font-semibold text-slate-950">{employee.firstName} {employee.lastName}</span>
                    <span className="mt-1 block break-all text-sm text-slate-600">{employee.email}</span>
                    <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-500">
                      <span><span className="font-medium text-slate-700">Department</span><br />{employee.departmentName ?? "—"}</span>
                      <span><span className="font-medium text-slate-700">Job title</span><br />{employee.jobTitle ?? "—"}</span>
                      <span><span className="font-medium text-slate-700">Employee no.</span><br />{employee.employeeNumber ?? "—"}</span>
                      <span><span className="font-medium text-slate-700">Joined</span><br />{formatDate(employee.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        </PageContainer>
      </div>
    </AdminShell>
  );
}
