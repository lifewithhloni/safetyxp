import { Bell, ShieldCheck } from "lucide-react";

export function Header({ title, description }: { title: string; description: string }) {
  return (
    <header className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.04)] backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b3d91] text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">SafetyXP</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50">
            <Bell size={17} />
          </button>
          <div className="hidden rounded-full border border-slate-200 px-3 py-2 sm:flex sm:items-center sm:gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b3d91] text-xs font-semibold text-white">
              MC
            </div>
            <span className="text-sm font-medium text-slate-700">Maya Chen</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#1565c0]">{title}</p>
      </div>
    </header>
  );
}
