"use client";

import { motion } from "framer-motion";
import type { CertificateStatus } from "@/types/reports";

const urgencyClasses = {
  high: "bg-rose-50 text-rose-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-emerald-50 text-emerald-700",
} as const;

export function CertificateStatusCard({ certificate }: { certificate: CertificateStatus }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-slate-900">{certificate.title}</h4>
          <p className="mt-1 text-sm text-slate-500">{certificate.hint}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${urgencyClasses[certificate.urgency]}`}>{certificate.count}</span>
      </div>
    </motion.div>
  );
}
