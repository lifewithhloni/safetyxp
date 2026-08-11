"use client";

import { motion } from "framer-motion";
import type { AttentionEmployee } from "@/types/reports";

export function EmployeeAttentionTable({ employees }: { employees: AttentionEmployee[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-900">Employees requiring attention</h3>
        <p className="mt-1 text-sm text-slate-500">Key individuals who need intervention or follow-up this period.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Department</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Reason</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Recommended action</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {employees.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-semibold text-slate-900">{item.employee}</td>
                <td className="px-4 py-4 text-slate-600">{item.department}</td>
                <td className="px-4 py-4 text-slate-600">{item.reason}</td>
                <td className="px-4 py-4 text-slate-600">{item.action}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.status === "Overdue" ? "bg-rose-50 text-rose-700" : item.status === "At Risk" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                      Send reminder
                    </button>
                    <button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                      View profile
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
