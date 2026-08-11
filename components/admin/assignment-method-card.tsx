"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Building2, Users, UploadCloud } from "lucide-react";

type AssignmentMethodCardProps = {
  title: string;
  description: string;
  icon: "company" | "departments" | "csv";
  selected?: boolean;
  onSelect?: () => void;
  badge?: string;
  children?: React.ReactNode;
};

const iconMap = {
  company: Users,
  departments: Building2,
  csv: UploadCloud,
};

export function AssignmentMethodCard({
  title,
  description,
  icon,
  selected = false,
  onSelect,
  badge,
  children,
}: AssignmentMethodCardProps) {
  const Icon = iconMap[icon];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full rounded-3xl border bg-white p-6 text-left shadow-sm transition ${
        selected
          ? "border-[#0b3d91] ring-2 ring-[#0b3d91]/15"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ${selected ? "bg-[#0b3d91] text-white" : "bg-slate-100 text-slate-700"}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {badge}
            </span>
          ) : null}
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-[#0b3d91] bg-[#0b3d91] text-white" : "border-slate-300 text-slate-400"}`}>
            {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
          </span>
        </div>
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </motion.button>
  );
}
