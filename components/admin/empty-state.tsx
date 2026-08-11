"use client";

import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="rounded-full bg-white p-3 text-slate-500 shadow-sm">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
