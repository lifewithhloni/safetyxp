"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/navigation/topbar";

export function AdminLayout({
  children,
  title,
  description,
  breadcrumb = ["Admin"],
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumb?: string[];
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1">
          <Topbar title={title} description={description} breadcrumb={breadcrumb} onMenuClick={() => setSidebarOpen(true)} />
          <AnimatePresence mode="wait">
            <motion.main
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-h-[calc(100vh-5rem)]"
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
