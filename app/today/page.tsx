import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { MissionCard } from "@/components/cards/mission-card";
import { hasIssuedEmployeeCertificate } from "@/services/certificates/certificate.service";

async function CertificateNotice() {
  const hasIssuedCertificate = await hasIssuedEmployeeCertificate();

  if (!hasIssuedCertificate) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      Certificate available
    </div>
  );
}

export default function TodayPage() {
  return (
    <AppShell title="Today" description="Your daily mission is ready">
      <div className="mx-auto max-w-3xl space-y-4">
        <Suspense fallback={null}>
          <CertificateNotice />
        </Suspense>
        <MissionCard />
      </div>
    </AppShell>
  );
}
