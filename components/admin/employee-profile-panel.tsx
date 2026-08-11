"use client";

import { motion } from "framer-motion";
import { X, Clock3, Award, Sparkles } from "lucide-react";
import type { EmployeeRecord } from "@/types/employee-management";
import { ComplianceBadge } from "@/components/admin/compliance-badge";
import { ProgressBar } from "@/components/admin/progress-bar";

type EmployeeProfilePanelProps = {
  employee: EmployeeRecord;
  onClose: () => void;
};

export function EmployeeProfilePanel({ employee, onClose }: EmployeeProfilePanelProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 p-4">
      <motion.div initial={{ x: 24 }} animate={{ x: 0 }} exit={{ x: 24 }} className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b3d91] text-lg font-semibold text-white">{employee.name.split(" ").map((item) => item[0]).join("").slice(0, 2)}</div>
            <div>
              <p className="text-xl font-semibold text-slate-900">{employee.name}</p>
              <p className="text-sm text-slate-500">{employee.employeeNumber} • {employee.department}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Current campaign</p>
                  <p className="text-lg font-semibold text-slate-900">{employee.campaign}</p>
                </div>
                <ComplianceBadge status={employee.status} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Completion</span>
                  <span>{employee.progress}%</span>
                </div>
                <ProgressBar percent={employee.progress} />
              </div>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-[#0b3d91] p-4 text-white">
              <p className="text-sm text-blue-100">AI insight</p>
              <p className="mt-2 text-sm leading-6">{employee.aiInsight}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500"><Clock3 className="h-4 w-4" /> Time remaining</div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{employee.timeRemaining}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500"><Award className="h-4 w-4" /> Certificates</div>
              <p className="mt-2 text-lg font-semibold text-slate-900">{employee.certificates.length}</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-500"><Sparkles className="h-4 w-4" /> XP level</div>
              <p className="mt-2 text-lg font-semibold text-slate-900">Level {employee.level}</p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Recent activity</h3>
            <div className="mt-3 space-y-3">
              {employee.activityTimeline.map((item) => (
                <div key={item.title} className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-white p-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.meta}</p>
                  </div>
                  <span className="text-sm text-slate-400">Now</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Certificates</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {employee.certificates.length > 0 ? employee.certificates.map((certificate) => (
                <div key={certificate.title} className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                  <p className="font-medium text-slate-900">{certificate.title}</p>
                  <p className="mt-1 text-sm text-slate-500">Expires {certificate.expiryDate}</p>
                  <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{certificate.status}</span>
                </div>
              )) : <p className="rounded-[16px] border border-dashed border-slate-200 p-4 text-sm text-slate-500">No certificates earned yet.</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
