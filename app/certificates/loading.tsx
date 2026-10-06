import { AppShell } from "@/components/layout/app-shell";

export default function CertificatesLoading() {
  return (
    <AppShell title="Certificates" description="Your compliance record">
      <div
        role="status"
        aria-live="polite"
        className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8"
      >
        Loading certificates...
      </div>
    </AppShell>
  );
}
