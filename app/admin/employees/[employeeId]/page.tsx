import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { getCompanyEmployeeCertificates } from "@/services/certificates/certificate.service";
import {
  EmployeeAccessError,
  getCompanyEmployee,
  redirectForEmployeeAccessError,
} from "@/services/admin/employee-management.service";
import type { EmployeeDetail } from "@/types/admin-employee";

type PageProps = {
  params: Promise<{ employeeId: string }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ErrorState() {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      <h2 className="font-semibold">Employee details could not be loaded</h2>
      <p className="mt-1">Please try again. Employee records have not been changed.</p>
    </div>
  );
}

export default async function AdminEmployeeDetailPage({ params }: PageProps) {
  const { employeeId } = await params;

  let employee;
  try {
    employee = await getCompanyEmployee(employeeId);
  } catch (error) {
    if (error instanceof EmployeeAccessError) {
      redirectForEmployeeAccessError(error);
    }

    return (
      <AdminShell title="Employee" description="Company employee profile." breadcrumb={["Admin", "Employees"]}>
        <ErrorState />
      </AdminShell>
    );
  }

  if (!employee) {
    notFound();
  }

  let certificates;
  try {
    certificates = await getCompanyEmployeeCertificates(employee.id);
  } catch {
    return (
      <AdminShell title="Employee" description="Company employee profile." breadcrumb={["Admin", "Employees"]}>
        <ErrorState />
      </AdminShell>
    );
  }

  const detail: EmployeeDetail = { ...employee, certificates };
  const fullName = `${detail.firstName} ${detail.lastName}`.trim();
  const initials = `${detail.firstName.charAt(0)}${detail.lastName.charAt(0)}`.toUpperCase();

  return (
    <AdminShell title="Employee" description="Company employee profile." breadcrumb={["Admin", "Employees", fullName]}>
      <div className="space-y-6">
        <Link href="/admin/employees" className="inline-flex min-h-10 items-center rounded-lg pr-3 text-sm font-semibold text-[#0b3d91] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
          <span aria-hidden="true" className="mr-2 text-lg">←</span>
          All employees
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {detail.avatarUrl ? (
              <Image
                src={detail.avatarUrl}
                alt=""
                width={72}
                height={72}
                unoptimized
                className="h-18 w-18 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div aria-hidden="true" className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-[#0b3d91]">
                {initials}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b3d91]">Employee profile</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{fullName}</h2>
              <p className="mt-1 break-all text-sm text-slate-600">{detail.email}</p>
            </div>
          </div>

          <dl className="mt-7 grid gap-x-8 gap-y-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Department</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{detail.departmentName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Job title</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{detail.jobTitle ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Employee number</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{detail.employeeNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Joined</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(detail.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="employee-certificates-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 id="employee-certificates-heading" className="font-semibold text-slate-950">Certificates</h3>
            <p className="mt-1 text-sm text-slate-600">Certificate records associated with this employee.</p>
          </div>
          {detail.certificates.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-600">No certificates yet</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {detail.certificates.map((certificate) => (
                <li key={certificate.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6">
                  <div>
                    <p className="font-medium text-slate-950">{certificate.campaignName ?? "Certificate"}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{certificate.status}</p>
                  </div>
                  <p className="text-sm text-slate-600"><span className="font-medium text-slate-700">Issued</span> {formatDate(certificate.issuedAt)}</p>
                  <p className="text-sm text-slate-600"><span className="font-medium text-slate-700">Expires</span> {formatDate(certificate.expiresAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
