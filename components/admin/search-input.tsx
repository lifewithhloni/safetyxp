"use client";

import { Search } from "lucide-react";

export function SearchInput({ placeholder = "Search" }: { placeholder?: string }) {
  return (
    <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500 transition focus-within:border-[#90c822] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#9bdc28]/20">
      <Search className="h-[17px] w-[17px] shrink-0 text-slate-400" aria-hidden="true" />
      <input className="w-28 min-w-0 bg-transparent text-slate-800 outline-none placeholder:text-slate-400 sm:w-40" placeholder={placeholder} />
    </label>
  );
}
