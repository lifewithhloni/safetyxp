"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { MetricItem } from "@/types/admin";

export function MetricCard({ metric }: { metric: MetricItem }) {
  const iconMap = {
    up: ArrowUpRight,
    down: ArrowDownRight,
    neutral: Minus,
  };

  const Icon = iconMap[metric.trend];

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{metric.title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
        </div>
        <div className={`rounded-full p-2 ${metric.trend === "up" ? "bg-emerald-50 text-emerald-700" : metric.trend === "down" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <p className="text-slate-600">{metric.description}</p>
        <p className="font-medium text-slate-900">{metric.change}</p>
      </div>
    </div>
  );
}
