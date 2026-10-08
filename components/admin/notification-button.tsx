"use client";

import { Bell } from "lucide-react";

export function NotificationButton({ count = 0 }: { count?: number }) {
  return (
    <button type="button" aria-label="Notifications" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#d4e9b4] hover:bg-[#f8fbf4] hover:text-[#315a12]">
      <Bell className="h-[17px] w-[17px]" />
      {count > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0b3d91] text-[10px] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}
