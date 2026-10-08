import Link from "next/link";
import { AdminShell } from "@/features/admin/admin-shell";
import { PageContainer } from "@/components/admin/page-container";
import { getCompanyCertificates } from "@/services/certificates/certificate.service";

type AdminCertificateItem = {
  id: string;
  certificate_number: string;
  issued_at: string | null;
  expires_at: string | null;
  status: string;
  verification_code: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  } | null;
  campaigns?: {
    name?: string;
  } | null;
};

export default async function AdminCertificatesPage() {
  const certificates = await getCompanyCertificates();

  return (
    <AdminShell title="Certificates" description="View, verify, and manage company certificates." breadcrumb={["Admin", "Certificates"]}>
      <PageContainer>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-[#315a12]">Compliance</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#102a43] sm:text-4xl">Certificates</h2>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-[#f8fafc] text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Employee</th>
                  <th className="px-4 py-3 text-left font-medium">Campaign</th>
                  <th className="px-4 py-3 text-left font-medium">Certificate Number</th>
                  <th className="px-4 py-3 text-left font-medium">Issued</th>
                  <th className="px-4 py-3 text-left font-medium">Expiry</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {(certificates as AdminCertificateItem[]).map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">{`${item.profiles?.first_name ?? ""} ${item.profiles?.last_name ?? ""}`.trim() || "Employee"}</td>
                    <td className="px-4 py-3">{item.campaigns?.name ?? "Campaign"}</td>
                    <td className="px-4 py-3">{item.certificate_number}</td>
                    <td className="px-4 py-3">{item.issued_at ? new Date(item.issued_at).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="px-4 py-3">{item.expires_at ? new Date(item.expires_at).toLocaleDateString("en-GB") : "-"}</td>
                    <td className="px-4 py-3 uppercase">{item.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/verify/${item.verification_code}`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#102a43] transition hover:border-[#d4e9b4] hover:bg-[#f8fbf4]">Verify</Link>
                        <Link href={`/api/certificates/${item.id}/download`} className="rounded-xl bg-[#9bdc28] px-3 py-1.5 text-xs font-semibold text-[#102a43] transition hover:bg-[#b6eb6f]">Download</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </PageContainer>
    </AdminShell>
  );
}
