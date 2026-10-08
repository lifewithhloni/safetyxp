"use client";

import Link from "next/link";
import { Home, Users, BookOpenCheck, FileText, BarChart3, BadgeCheck, Settings } from "lucide-react";
import type { AdminNavItem } from "@/types/admin";

const iconMap = {
  home: Home,
  users: Users,
  campaigns: BookOpenCheck,
  policies: FileText,
  reports: BarChart3,
  certificates: BadgeCheck,
  settings: Settings,
};

type SidebarItemProps = {
  item: AdminNavItem;
  active: boolean;
};

export function SidebarItem({ item, active }: SidebarItemProps) {
  const Icon = iconMap[item.icon];

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-[#9bdc28] text-[#102a43]"
            : "text-slate-200 hover:bg-white/10 hover:text-white"
        }`}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.label}</span>
        <span className={`mt-0.5 block truncate text-xs font-normal ${active ? "text-[#102a43]/70" : "text-slate-400"}`}>{item.description}</span>
      </span>
      {active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#102a43]" aria-hidden="true" /> : null}
    </Link>
  );
}
