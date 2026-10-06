import { randomBytes, randomUUID } from "node:crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export function generateCertificateNumber(issueDate = new Date()) {
  const year = issueDate.getUTCFullYear();
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `SXP-${year}-${suffix}`;
}

export function generateVerificationCode() {
  return randomBytes(24).toString("base64url");
}

export async function generateCertificatePdf(input: {
  employeeName: string;
  campaignName: string;
  companyName: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  expiresAt: string | null;
  verificationUrl: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderColor: rgb(0.04, 0.24, 0.57), borderWidth: 2 });
  page.drawText("SafetyXP", { x: 48, y: 548, size: 24, font: titleFont, color: rgb(0.04, 0.24, 0.57) });
  page.drawText("Certificate of Completion", { x: 240, y: 500, size: 30, font: titleFont, color: rgb(0.08, 0.1, 0.12) });
  page.drawText("This certifies that", { x: 352, y: 458, size: 14, font: bodyFont, color: rgb(0.28, 0.31, 0.36) });
  page.drawText(input.employeeName, { x: 280, y: 425, size: 28, font: titleFont, color: rgb(0.08, 0.1, 0.12) });
  page.drawText("has successfully completed", { x: 320, y: 390, size: 14, font: bodyFont, color: rgb(0.28, 0.31, 0.36) });
  page.drawText(input.campaignName, { x: 300, y: 360, size: 20, font: titleFont, color: rgb(0.08, 0.1, 0.12) });
  page.drawText(`Issued by ${input.companyName}`, { x: 320, y: 332, size: 12, font: bodyFont, color: rgb(0.28, 0.31, 0.36) });

  page.drawText(`Certificate Number: ${input.certificateNumber}`, { x: 48, y: 130, size: 11, font: bodyFont, color: rgb(0.14, 0.17, 0.22) });
  page.drawText(`Verification Code: ${input.verificationCode}`, { x: 48, y: 112, size: 11, font: bodyFont, color: rgb(0.14, 0.17, 0.22) });
  page.drawText(`Issued: ${new Date(input.issuedAt).toLocaleDateString("en-GB")}`, { x: 48, y: 94, size: 11, font: bodyFont, color: rgb(0.14, 0.17, 0.22) });
  page.drawText(`Expires: ${input.expiresAt ? new Date(input.expiresAt).toLocaleDateString("en-GB") : "No expiry"}`, { x: 48, y: 76, size: 11, font: bodyFont, color: rgb(0.14, 0.17, 0.22) });

  const qrPngDataUrl = await QRCode.toDataURL(input.verificationUrl, { margin: 1, width: 120 });
  const qrBytes = Uint8Array.from(Buffer.from(qrPngDataUrl.split(",")[1], "base64"));
  const qrImage = await pdf.embedPng(qrBytes);
  page.drawImage(qrImage, { x: 700, y: 64, width: 100, height: 100 });
  page.drawText("Scan to verify", { x: 706, y: 48, size: 10, font: bodyFont, color: rgb(0.28, 0.31, 0.36) });

  const bytes = await pdf.save();
  return new Uint8Array(bytes);
}

export function buildCertificateRecord(input: {
  companyId: string;
  employeeId: string;
  campaignId: string;
  issuedAt: string;
  expiresAt: string | null;
}) {
  return {
    id: randomUUID(),
    company_id: input.companyId,
    employee_id: input.employeeId,
    campaign_id: input.campaignId,
    certificate_number: generateCertificateNumber(new Date(input.issuedAt)),
    verification_code: generateVerificationCode(),
    issued_at: input.issuedAt,
    expires_at: input.expiresAt,
    status: "generating",
    storage_path: null,
    updated_at: new Date().toISOString(),
  };
}
