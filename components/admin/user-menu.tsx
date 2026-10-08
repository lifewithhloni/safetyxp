"use client";

import { ChevronDown } from "lucide-react";

export function UserMenu({
  name,
  role,
  avatarUrl,
}: {
  name: string;
  role: string;
  avatarUrl?: string | null;
}) {
  return (
    <button type="button" className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 transition hover:border-[#d4e9b4] sm:px-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9bdc28] bg-cover bg-center text-sm font-semibold text-[#102a43]"
        style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
        aria-label={avatarUrl ? `${name} avatar` : undefined}
      >
        {avatarUrl ? null : name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
      </div>
      <div className="hidden min-w-0 text-left sm:block">
        <p className="max-w-28 truncate text-sm font-semibold text-[#102a43]">{name}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}
