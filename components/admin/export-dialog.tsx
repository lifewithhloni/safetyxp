"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ExportDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<"pdf" | "excel" | "csv" | "schedule">("pdf");

  const handleExport = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-2xl rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Export report</h3>
                <p className="mt-1 text-sm text-slate-500">Choose your export format and schedule the report delivery.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">Close</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setSelectedType("pdf")} className={`rounded-[20px] border px-4 py-4 text-left ${selectedType === "pdf" ? "border-[#0b3d91] bg-slate-50" : "border-slate-200 bg-white"}`}>
                <p className="text-sm font-semibold text-slate-900">Generate PDF Report</p>
                <p className="mt-2 text-sm text-slate-600">Styled summary for leadership review.</p>
              </button>
              <button type="button" onClick={() => setSelectedType("excel")} className={`rounded-[20px] border px-4 py-4 text-left ${selectedType === "excel" ? "border-[#0b3d91] bg-slate-50" : "border-slate-200 bg-white"}`}>
                <p className="text-sm font-semibold text-slate-900">Export Excel</p>
                <p className="mt-2 text-sm text-slate-600">Detailed campaign and employee data.</p>
              </button>
              <button type="button" onClick={() => setSelectedType("csv")} className={`rounded-[20px] border px-4 py-4 text-left ${selectedType === "csv" ? "border-[#0b3d91] bg-slate-50" : "border-slate-200 bg-white"}`}>
                <p className="text-sm font-semibold text-slate-900">Export CSV</p>
                <p className="mt-2 text-sm text-slate-600">Raw compliance dataset for downstream analysis.</p>
              </button>
              <button type="button" onClick={() => setSelectedType("schedule")} className={`rounded-[20px] border px-4 py-4 text-left ${selectedType === "schedule" ? "border-[#0b3d91] bg-slate-50" : "border-slate-200 bg-white"}`}>
                <p className="text-sm font-semibold text-slate-900">Schedule Weekly Report</p>
                <p className="mt-2 text-sm text-slate-600">Deliver the report to leadership automatically.</p>
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <button type="button" onClick={handleExport} disabled={loading} className="inline-flex items-center justify-center rounded-full bg-[#0b3d91] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#083069] disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? "Exporting..." : "Start Export"}
              </button>
              <p className="text-sm text-slate-500">Selected: {selectedType.toUpperCase()}</p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
