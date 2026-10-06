import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { getEmployeeCertificates } from "@/services/certificates/certificate.service";
import { ArrowRight, FileText } from "lucide-react";

type EmployeeCertificateItem = {
  id: string;
  certificate_number: string;
  status: string;
  verification_code: string;
  expires_at: string | null;
  campaigns?: { name?: string } | null;
};

export default async function CertificatesPage() {
  const certificates = await getEmployeeCertificates();

  return (
    <AppShell title="Certificates" description="Your compliance record">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#1565c0]">Records</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Current certificates</h2>
          </div>
          <Link href="/today" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
            Back to today
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-8 space-y-3">
          {(certificates as EmployeeCertificateItem[]).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-[#f7f9fc] px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#0b3d91] shadow-sm">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.campaigns?.name ?? "Safety Training"}</p>
                  <p className="text-xs text-slate-500 uppercase">{item.status}</p>
                  <p className="text-xs text-slate-500">{item.certificate_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-500">{item.expires_at ? new Date(item.expires_at).toLocaleDateString("en-GB") : "No expiry"}</p>
                <Link href={`/verify/${item.verification_code}`} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">View</Link>
                <Link href={`/api/certificates/${item.id}/download`} className="rounded-full bg-[#0b3d91] px-3 py-1.5 text-xs font-semibold text-white">Download</Link>
              </div>
            </div>
          ))}

          {certificates.length === 0 ? <p className="rounded-[20px] border border-dashed border-slate-300 p-5 text-sm text-slate-500">No certificates have been issued yet.</p> : null}
        </div>
      </div>
    </AppShell>
  );
}
