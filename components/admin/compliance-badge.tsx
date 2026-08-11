"use client";

import type { EmployeeRecord } from "@/types/employee-management";

type ComplianceBadgeProps = {
  status: EmployeeRecord["status"];
};

export function ComplianceBadge({ status }: ComplianceBadgeProps) {
  const classes: Record<EmployeeRecord["status"], string> = {
    Compliant: "bg-emerald-50 text-emerald-700",
    "In Progress": "bg-amber-50 text-amber-700",
    Overdue: "bg-rose-50 text-rose-700",
    "Not Started": "bg-slate-100 text-slate-700",
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${classes[status]}`}>{status}</span>;
}
