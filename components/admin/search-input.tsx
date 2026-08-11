"use client";

import { Search } from "lucide-react";

export function SearchInput({ placeholder = "Search" }: { placeholder?: string }) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
      <Search className="h-4 w-4" />
      <input className="w-32 bg-transparent outline-none sm:w-44" placeholder={placeholder} />
    </label>
  );
}
