"use client";

import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { AdminShell } from "@/features/admin/admin-shell";

export default function AdminEmployeesPage() {
  return (
    <AdminShell title="Employees" description="Manage your workforce and compliance access." breadcrumb={["Admin", "Employees"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b3d91]">Workforce</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">Employees</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-4 py-2.5 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
            <Link href="/admin/employees/import" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">
              <Upload className="h-4 w-4" />
              Import CSV
            </Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Employee overview</h3>
              <p className="mt-1 text-sm text-slate-600">Invitation status, department placement, and compliance health are shown here.</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Employee Number</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Invitation Status</th>
                  <th className="px-4 py-3 font-medium">Compliance Status</th>
                  <th className="px-4 py-3 font-medium">Last Active</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="px-4 py-3">Ava Johnson</td>
                  <td className="px-4 py-3">EMP001</td>
                  <td className="px-4 py-3">Operations</td>
                  <td className="px-4 py-3">Safety Coordinator</td>
                  <td className="px-4 py-3">Nadia Brooks</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Compliant</span></td>
                  <td className="px-4 py-3">Today</td>
                  <td className="px-4 py-3">View</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
