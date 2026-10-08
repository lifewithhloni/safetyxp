"use client";

import { motion } from "framer-motion";
import { ChevronRight, Menu, ChevronDown } from "lucide-react";
import { SearchInput } from "@/components/admin/search-input";
import { NotificationButton } from "@/components/admin/notification-button";
import { UserMenu } from "@/components/admin/user-menu";
import { useAuth } from "@/providers/auth-provider";

type TopbarProps = {
  title: string;
  description?: string;
  breadcrumb?: string[];
  onMenuClick?: () => void;
};

export function Topbar({ title, description, breadcrumb = ["Admin"], onMenuClick }: TopbarProps) {
  const { isLoading, user, company } = useAuth();
  const hasProfile = Boolean(user?.companyId);
  const userName = hasProfile && user ? user.fullName : isLoading ? "Loading profile" : "Profile unavailable";
  const userRole = hasProfile && user
    ? user.role === "super_admin" ? "Super Admin" : "Company Admin"
    : "Profile unavailable";
  const companyName = company?.name ?? (isLoading ? "Loading workspace" : "Workspace unavailable");

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur"
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Open admin navigation" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#d4e9b4] hover:text-[#315a12] lg:hidden" onClick={onMenuClick}>
            <Menu className="h-[18px] w-[18px]" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500 sm:text-sm">
              {breadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : null}
                  <span>{item}</span>
                </span>
              ))}
            </div>
            <h1 className="truncate text-lg font-bold tracking-tight text-[#102a43] sm:text-xl">{title}</h1>
            {description ? <p className="hidden text-sm text-slate-500 md:block">{description}</p> : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
          <SearchInput placeholder="Search workspace" />
          <NotificationButton />
          <button type="button" className="inline-flex h-11 min-w-0 max-w-[min(44vw,220px)] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-[#102a43] transition hover:border-[#d4e9b4]">
            <span className="truncate">{companyName}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
          <UserMenu
            name={userName}
            role={userRole}
            avatarUrl={hasProfile && user ? user.avatarUrl : null}
          />
        </div>
      </div>
    </motion.header>
  );
}
