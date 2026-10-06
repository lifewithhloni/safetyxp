import { supabaseAdmin } from "@/lib/supabase/admin";

export async function storeCertificate(certificateId: string, companyId: string, pdfBytes: Uint8Array) {
  const storagePath = `company/${companyId}/certificates/${certificateId}.pdf`;
  const { error } = await supabaseAdmin.storage
    .from("certificates")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to store certificate: ${error.message}`);
  }

  return { storagePath };
}

export async function getSignedCertificateDownloadUrl(storagePath: string, expiresInSeconds = 120) {
  const { data, error } = await supabaseAdmin.storage
    .from("certificates")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Could not generate signed certificate URL.");
  }

  return data.signedUrl;
}
