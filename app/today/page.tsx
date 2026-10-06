import { AppShell } from "@/components/layout/app-shell";
import { MissionCard } from "@/components/cards/mission-card";
import { getEmployeeCertificates } from "@/services/certificates/certificate.service";

export default async function TodayPage() {
  const certificates = await getEmployeeCertificates();
  const hasIssuedCertificate = certificates.some((certificate) => certificate.status === "issued");

  return (
    <AppShell title="Today" description="Your daily mission is ready">
      <div className="mx-auto max-w-3xl space-y-4">
        {hasIssuedCertificate ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Certificate available
          </div>
        ) : null}
        <MissionCard />
      </div>
    </AppShell>
  );
}
