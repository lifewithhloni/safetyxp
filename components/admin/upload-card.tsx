"use client";

import { useState } from "react";
import { FileText, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import type { UploadedDocument } from "@/types/campaign";

type UploadCardProps = {
  document: UploadedDocument | null;
  onFileSelect: (file: File) => void;
  onContinue: () => void;
};

export function UploadCard({ document, onFileSelect, onContinue }: UploadCardProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Upload policy</h3>
            <p className="mt-1 text-sm text-slate-600">Drop in a policy document and let AI turn it into a guided learning campaign.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">PDF • DOCX • PPTX</div>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-8 py-12 text-center transition ${dragActive ? "border-[#0b3d91] bg-[#eff5ff]" : "border-slate-300 bg-slate-50"}`}
        >
          <div className="rounded-full bg-white p-3 shadow-sm">
            <FileText className="h-6 w-6 text-[#0b3d91]" />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-900">Drop your policy here or click to browse</p>
          <p className="mt-2 text-sm text-slate-600">Supported formats: PDF, DOCX, PPTX</p>
          <input type="file" accept=".pdf,.docx,.pptx" onChange={(event) => handleFiles(event.target.files)} className="hidden" />
        </div>

        {document ? (
          <div className="mt-6 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{document.name}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span>{document.size}</span>
                  <span>{document.pages} pages</span>
                  <span>Estimated reading time: {document.readingTime}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  <RefreshCw className="h-4 w-4" />
                  Replace
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={onContinue} className="inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white">
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
