"use client";

import { motion } from "framer-motion";
import { BadgeCheck, QrCode } from "lucide-react";

export function CertificatePreview() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-[#0b3d91]">
        <BadgeCheck className="h-5 w-5" />
        <h3 className="text-xl font-semibold text-slate-900">Certificate preview</h3>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-[#f9fbff] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0b3d91]">SafetyXP</p>
            <p className="text-lg font-semibold text-slate-900">Certificate of Completion</p>
          </div>
          <div className="rounded-full bg-white p-3 shadow-sm">
            <BadgeCheck className="h-6 w-6 text-[#0b3d91]" />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">This certifies that</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Ava Johnson</p>
          <p className="mt-4 text-slate-700">has successfully completed the Fire Safety Refresh campaign.</p>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-4 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">Issue date</p>
            <p className="mt-1">07 Aug 2026</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Certificate ID</p>
            <p className="mt-1">SXP-48291</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <QrCode className="mx-auto h-6 w-6 text-[#0b3d91]" />
            <p className="mt-2 text-xs text-slate-500">QR placeholder</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
