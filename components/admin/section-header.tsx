"use client";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-bold tracking-tight text-[#102a43]">{title}</h2>
      {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
