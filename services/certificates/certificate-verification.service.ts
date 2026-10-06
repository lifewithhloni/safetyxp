import { supabaseAdmin } from "@/lib/supabase/admin";

export type PublicCertificateVerification = {
  verificationStatus: "VALID" | "EXPIRED" | "REVOKED" | "INVALID";
  certificateStatus: string;
  certificateTitle: string;
  employeeDisplayName: string;
  companyName: string;
  campaignName: string;
  issueDate: string | null;
  expiryDate: string | null;
  certificateNumber: string;
};

function maskName(firstName: string | null | undefined, lastName: string | null | undefined) {
  const first = (firstName ?? "").trim();
  const lastInitial = (lastName ?? "").trim().charAt(0);

  if (!first) {
    return "Employee";
  }

  return `${first} ${lastInitial ? `${lastInitial}.` : ""}`.trim();
}

export function getCertificateStatus(status: string, expiresAt: string | null) {
  if (status === "revoked") {
    return "REVOKED" as const;
  }

  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return "EXPIRED" as const;
  }

  return "VALID" as const;
}

export async function verifyCertificate(verificationCode: string): Promise<PublicCertificateVerification | null> {
  if (!verificationCode || verificationCode.length < 16) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select(`
      certificate_number,
      status,
      issued_at,
      expires_at,
      campaigns(name),
      companies(name),
      profiles(first_name,last_name)
    `)
    .eq("verification_code", verificationCode)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const campaign = Array.isArray(data.campaigns) ? data.campaigns[0] : data.campaigns;
  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies;
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const verificationStatus = getCertificateStatus(data.status, data.expires_at);

  return {
    verificationStatus,
    certificateStatus: data.status,
    certificateTitle: campaign?.name ?? "Safety Training",
    employeeDisplayName: maskName(profile?.first_name, profile?.last_name),
    companyName: company?.name ?? "SafetyXP Company",
    campaignName: campaign?.name ?? "Safety Training",
    issueDate: data.issued_at,
    expiryDate: data.expires_at,
    certificateNumber: data.certificate_number,
  };
}
