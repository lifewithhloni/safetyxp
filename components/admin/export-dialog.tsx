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
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }} className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[#102a43]">Export report</h3>
                <p className="mt-1 text-sm text-slate-500">Choose your export format and schedule the report delivery.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">Close</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button type="button" onClick={() => setSelectedType("pdf")} className={`rounded-2xl border px-4 py-4 text-left transition ${selectedType === "pdf" ? "border-[#9bdc28] bg-[#f8fbf4]" : "border-slate-200 bg-white hover:border-[#d4e9b4]"}`}>
                <p className="text-sm font-semibold text-[#102a43]">Generate PDF Report</p>
                <p className="mt-2 text-sm text-slate-600">Styled summary for leadership review.</p>
              </button>
              <button type="button" onClick={() => setSelectedType("excel")} className={`rounded-2xl border px-4 py-4 text-left transition ${selectedType === "excel" ? "border-[#9bdc28] bg-[#f8fbf4]" : "border-slate-200 bg-white hover:border-[#d4e9b4]"}`}>
                <p className="text-sm font-semibold text-[#102a43]">Export Excel</p>
                <p className="mt-2 text-sm text-slate-600">Detailed campaign and employee data.</p>
              </button>
              <button type="button" onClick={() => setSelectedType("csv")} className={`rounded-2xl border px-4 py-4 text-left transition ${selectedType === "csv" ? "border-[#9bdc28] bg-[#f8fbf4]" : "border-slate-200 bg-white hover:border-[#d4e9b4]"}`}>
                <p className="text-sm font-semibold text-[#102a43]">Export CSV</p>
                <p className="mt-2 text-sm text-slate-600">Raw compliance dataset for downstream analysis.</p>
              </button>
              <button type="button" onClick={() => setSelectedType("schedule")} className={`rounded-2xl border px-4 py-4 text-left transition ${selectedType === "schedule" ? "border-[#9bdc28] bg-[#f8fbf4]" : "border-slate-200 bg-white hover:border-[#d4e9b4]"}`}>
                <p className="text-sm font-semibold text-[#102a43]">Schedule Weekly Report</p>
                <p className="mt-2 text-sm text-slate-600">Deliver the report to leadership automatically.</p>
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <button type="button" onClick={handleExport} disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-[#9bdc28] px-6 py-3 text-sm font-semibold text-[#102a43] transition hover:bg-[#b6eb6f] disabled:cursor-not-allowed disabled:opacity-50">
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
