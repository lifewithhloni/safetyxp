"use client";

import { usePathname } from "next/navigation";
import { X, PanelLeftClose, ShieldCheck } from "lucide-react";
import { adminNavigation } from "@/services/admin";
import { SidebarItem } from "@/components/admin/sidebar-item";
import { useAuth } from "@/providers/auth-provider";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isLoading, user, company } = useAuth();
  const hasProfile = Boolean(user?.companyId);
  const fullName = hasProfile && user ? user.fullName : isLoading ? "Loading profile" : "Profile unavailable";
  const initials = hasProfile && user
    ? user.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()
    : null;
  const companyName = company?.name ?? (isLoading ? "Loading workspace" : "Workspace unavailable");
  const roleLabel = hasProfile && user
    ? user.role === "super_admin" ? "Super Admin" : "Company Admin"
    : "Profile unavailable";
  const avatarUrl = hasProfile && user ? user.avatarUrl : null;

  return (
    <>
      <button
        type="button"
        aria-label="Close admin navigation"
        className={`fixed inset-0 z-40 bg-[#071c2b]/55 transition-opacity lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={onClose}
      />
      <aside
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-[#102a43] px-5 py-6 text-white shadow-2xl transition-[transform,visibility] duration-200 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full lg:visible"
        } lg:sticky lg:top-0 lg:z-0 lg:visible lg:translate-x-0 lg:shadow-none`}
      >
        <div className="flex items-center justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9bdc28] text-[#102a43]">
              <ShieldCheck className="h-[21px] w-[21px]" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">SafetyXP</p>
              <p className="text-[11px] font-medium text-slate-300">Management workspace</p>
            </div>
          </div>
          <button type="button" aria-label="Close admin navigation" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden" onClick={onClose}>
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-8 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 lg:hidden">
          <span>Workspace</span>
          <button type="button" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-medium text-white transition hover:bg-white/15">
            <PanelLeftClose className="h-3.5 w-3.5" />
            Switch
          </button>
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto">
          {adminNavigation.map((item) => (
            <SidebarItem key={item.href} item={item} active={pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))} />
          ))}
        </nav>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#9bdc28] bg-cover bg-center text-sm font-semibold text-[#102a43]"
              style={avatarUrl ? { backgroundImage: `url("${avatarUrl}")` } : undefined}
              aria-label={avatarUrl ? `${fullName} avatar` : undefined}
            >
              {avatarUrl ? null : initials ?? <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <p className="truncate text-sm font-semibold text-white">{fullName}</p>
              <p className="text-xs text-slate-300">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-[#102a43] px-3 py-2.5 text-sm text-slate-300">
            <p className="truncate font-medium text-white">{companyName}</p>
          </div>
          <button type="button" className="mt-4 w-full rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white">
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
