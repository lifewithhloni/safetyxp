import Link from "next/link";
import { verifyCertificate } from "@/services/certificates/certificate-verification.service";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ verificationCode: string }>;
}) {
  const { verificationCode } = await params;
  const result = await verifyCertificate(verificationCode);

  if (!result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Verification</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Certificate Not Found</h1>
          <p className="mt-3 text-sm text-slate-600">The verification code is invalid or unavailable.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-full bg-[#0b3d91] px-4 py-2 text-sm font-semibold text-white">
            Return to SafetyXP
          </Link>
        </div>
      </main>
    );
  }

  const heading = result.verificationStatus === "VALID"
    ? "Certificate Verified"
    : result.verificationStatus === "EXPIRED"
      ? "Certificate Expired"
      : "Certificate Revoked";

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Verification</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{heading}</h1>
        <p className="mt-1 text-sm text-slate-600">{result.certificateTitle}</p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employee</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{result.employeeDisplayName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Company</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{result.companyName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Campaign</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{result.campaignName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Certificate</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{result.certificateNumber}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Issued</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{result.issueDate ? new Date(result.issueDate).toLocaleDateString("en-GB") : "Not issued"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Expires</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{result.expiryDate ? new Date(result.expiryDate).toLocaleDateString("en-GB") : "No expiry"}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
