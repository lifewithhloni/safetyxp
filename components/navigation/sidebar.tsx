"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { employeeExperienceNavigation, getNavigationItemsForRole } from "@/constants";
import { useAuth } from "@/providers/auth-provider";
import {
  Award,
  BookOpenCheck,
  CheckSquare,
  CircleHelp,
  FileText,
  Flag,
  Gift,
  Home,
  Library,
  ShieldCheck,
  type LucideIcon,
  X,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  Home,
  "My Learning": BookOpenCheck,
  Missions: Flag,
  "Knowledge Checks": CheckSquare,
  Certificates: FileText,
  Rewards: Gift,
  "My Progress": Award,
  Resources: Library,
  "Help & Support": CircleHelp,
  Admin: ShieldCheck,
};

export function Sidebar({
  mobileOpen,
  onNavigate,
}: {
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { isLoading, user } = useAuth();
  const showAdmin = getNavigationItemsForRole(isLoading ? null : user?.role ?? null).some(
    (item) => item.href === "/admin"
  );

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onNavigate}
        />
      ) : null}
      <aside
        aria-label="Employee navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(19rem,85vw)] flex-col bg-[#102a43] px-5 py-6 text-white shadow-2xl transition-transform duration-200 ${
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } lg:sticky lg:top-0 lg:z-0 lg:visible lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none`}
      >
        <div className="flex items-center justify-between">
          <Link href="/today" onClick={onNavigate} className="flex items-center gap-3 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9bdc28] text-[#102a43]">
              <ShieldCheck size={21} />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">SafetyXP</span>
              <span className="block text-[11px] font-medium text-slate-300">Employee workspace</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onNavigate}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-10 flex-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Workspace
          </p>
          <nav className="mt-3 space-y-1" aria-label="Main">
            {employeeExperienceNavigation.map((item) => {
              const Icon = icons[item.label];
              const active = item.href === "/today"
                ? pathname === "/today"
                : item.href !== null && !item.href.includes("#") && pathname === item.href;
              const classes = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                active
                  ? "bg-[#9bdc28] text-[#102a43]"
                  : item.available
                    ? "text-slate-200 hover:bg-white/10 hover:text-white"
                    : "cursor-not-allowed text-slate-400/70"
              }`;

              if (!item.available || !item.href) {
                return (
                  <div key={item.label} aria-disabled="true" title="Coming in a future update" className={classes}>
                    <Icon size={17} aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={classes}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {showAdmin ? (
          <div className="border-t border-white/10 pt-4">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Administration
            </p>
            <Link
              href="/admin"
              onClick={onNavigate}
              className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <ShieldCheck size={17} aria-hidden="true" />
              Admin
            </Link>
          </div>
        ) : null}

        <p className="mt-5 px-3 text-[11px] text-slate-400">Safety starts with one good decision.</p>
      </aside>
    </>
  );
}
