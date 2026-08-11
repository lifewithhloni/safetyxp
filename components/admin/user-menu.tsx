"use client";

import { ChevronDown } from "lucide-react";

export function UserMenu({ name, role }: { name: string; role: string }) {
  return (
    <button type="button" className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b3d91] text-sm font-semibold text-white">
        {name.slice(0, 1)}
      </div>
      <div className="text-left">
        <p className="text-sm font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
      <ChevronDown className="h-4 w-4 text-slate-500" />
    </button>
  );
}
