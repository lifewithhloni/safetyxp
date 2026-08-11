"use client";

type ProgressBarProps = {
  percent: number;
};

export function ProgressBar({ percent }: ProgressBarProps) {
  return (
    <div className="h-2 w-full rounded-full bg-slate-200">
      <div className="h-2 rounded-full bg-[#0b3d91]" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}
