"use client";

import { Bell } from "lucide-react";

export function NotificationButton({ count = 0 }: { count?: number }) {
  return (
    <button type="button" className="relative rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:text-slate-900">
      <Bell className="h-4 w-4" />
      {count > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0b3d91] text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}
