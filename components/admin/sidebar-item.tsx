"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
    <Link href={item.href} className="block">
      <motion.div
        whileHover={{ x: 2, scale: 1.01 }}
        className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 transition ${
          active
            ? "bg-[#0b3d91] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        <div className={`rounded-xl p-2 ${active ? "bg-white/15" : "bg-slate-100"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{item.label}</p>
          <p className={`mt-0.5 text-xs ${active ? "text-blue-100" : "text-slate-500"}`}>{item.description}</p>
        </div>
      </motion.div>
    </Link>
  );
}
