"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { X, PanelLeftClose, ShieldCheck } from "lucide-react";
import { adminNavigation } from "@/services/admin";
import { SidebarItem } from "@/components/admin/sidebar-item";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-slate-950/40 lg:hidden ${open ? "block" : "hidden"}`} onClick={onClose} />
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-slate-200 bg-white p-5 shadow-xl lg:sticky lg:top-0 lg:z-0 lg:h-[calc(100vh-2rem)] lg:translate-x-0 lg:shadow-none"
      >
        <div className="flex items-center justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#0b3d91] p-2.5 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">SafetyXP</p>
              <p className="text-xs text-slate-500">Admin Portal</p>
            </div>
          </div>
          <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:hidden">
          <span>Workspace</span>
          <button type="button" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
            <PanelLeftClose className="h-3.5 w-3.5" />
            Switch
          </button>
        </div>

        <nav className="mt-8 space-y-1.5">
          {adminNavigation.map((item) => (
            <SidebarItem key={item.href} item={item} active={pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))} />
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b3d91] text-sm font-semibold text-white">
              SA
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Sarah Adams</p>
              <p className="text-xs text-slate-500">Workspace Lead</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Northstar Safety</p>
            <p className="mt-1">Global operations</p>
          </div>
          <button type="button" className="mt-4 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            Logout
          </button>
        </div>
      </motion.aside>
    </>
  );
}
