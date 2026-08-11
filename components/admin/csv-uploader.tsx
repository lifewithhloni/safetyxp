"use client";

import { useRef, useState } from "react";
import { FileUp, Download } from "lucide-react";

type CSVUploaderProps = {
  onFileSelect: (file: File) => void;
};

export function CSVUploader({ onFileSelect }: CSVUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const triggerFileDialog = () => inputRef.current?.click();

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Upload employee list</h3>
          <p className="mt-1 text-sm text-slate-600">Upload an employee list exported from your HR system.</p>
        </div>
        <button
          type="button"
          onClick={triggerFileDialog}
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          Browse file
        </button>
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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition ${dragActive ? "border-[#0b3d91] bg-[#eaf2ff]" : "border-slate-300 bg-white"}`}
        onClick={triggerFileDialog}
      >
        <FileUp className="h-10 w-10 text-[#0b3d91]" />
        <p className="mt-3 text-base font-semibold text-slate-900">Drop your CSV here or click to browse</p>
        <p className="mt-2 text-sm text-slate-600">Supported: CSV • XLSX support coming soon</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 text-sm text-slate-600">
        <span>Use the template below to keep your import format consistent.</span>
        <a
          href="data:text/csv;charset=utf-8,First%20Name,Last%20Name,Email,Employee%20Number,Department,Job%20Title,Manager,Location%0AJohn,Doe,john%40company.com,EMP001,Operations,Operator,Jane%20Smith,Johannesburg"
          download="employee-import-template.csv"
          className="inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-3 py-2 font-medium text-white"
        >
          <Download className="h-4 w-4" />
          Download template
        </a>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        onChange={(event) => handleFiles(event.target.files)}
        className="hidden"
      />
    </div>
  );
}
