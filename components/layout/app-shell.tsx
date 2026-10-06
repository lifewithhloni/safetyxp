"use client";

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

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <Header title={title} description={description} />

        <div className="mt-4">
          <Sidebar />
        </div>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-5"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
