"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/navigation/header";
import { Sidebar } from "@/components/navigation/sidebar";

export function AppShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
        <div className="min-w-0 flex-1">
          <Header
            title={title}
            description={description}
            onMenuClick={() => setMobileNavOpen(true)}
          />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <AnimatePresence mode="sync">
              <motion.main
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {children}
              </motion.main>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
