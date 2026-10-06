import { ShieldCheck } from "lucide-react";
import { AvatarMenu } from "@/components/navigation/avatar-menu";
import { NotificationBell } from "@/components/navigation/notification-bell";

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
          <NotificationBell />
          <AvatarMenu />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#1565c0]">{title}</p>
      </div>
    </header>
  );
}
