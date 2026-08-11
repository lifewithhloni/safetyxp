import { Bell } from "lucide-react";

export function NotificationBell() {
  return (
    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50">
      <Bell size={17} />
    </button>
  );
}
