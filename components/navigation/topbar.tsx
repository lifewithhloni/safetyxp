"use client";

import { motion } from "framer-motion";
import { Bell, ChevronRight, Menu, Search, ChevronDown } from "lucide-react";
import { SearchInput } from "@/components/admin/search-input";
import { NotificationButton } from "@/components/admin/notification-button";
import { UserMenu } from "@/components/admin/user-menu";

type TopbarProps = {
  title: string;
  description?: string;
  breadcrumb?: string[];
  onMenuClick?: () => void;
};

export function Topbar({ title, description, breadcrumb = ["Admin"], onMenuClick }: TopbarProps) {
  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-20 border-b border-slate-200 bg-[#f7f9fc]/95 backdrop-blur"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button type="button" className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 lg:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              {breadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                  <span>{item}</span>
                </span>
              ))}
            </div>
            <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SearchInput placeholder="Search workspace" />
          <NotificationButton count={3} />
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <span>Northstar</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          <UserMenu name="Sarah" role="Admin" />
        </div>
      </div>
    </motion.header>
  );
}
