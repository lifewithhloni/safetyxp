"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavigationItemsForRole } from "@/constants";
import { useAuth } from "@/providers/auth-provider";
import { Home, BookOpenCheck, FileText, User, ShieldCheck, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "/today": Home,
  "/lesson": BookOpenCheck,
  "/certificates": FileText,
  "/profile": User,
  "/admin": ShieldCheck,
};

export function Sidebar() {
  const pathname = usePathname();
  const { isLoading, user } = useAuth();
  const navItems = getNavigationItemsForRole(isLoading ? null : user?.role ?? null);

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => {
        const Icon = icons[item.href];
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
              active ? "bg-[#0b3d91] text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
