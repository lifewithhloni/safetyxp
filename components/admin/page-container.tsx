"use client";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>;
}
