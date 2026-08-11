import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthShell } from "@/components/auth/auth-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SafetyXP",
  description: "Making compliance engaging for every employee.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full bg-[#f7f9fc] text-slate-900">
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}
