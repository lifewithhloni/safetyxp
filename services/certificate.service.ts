import type { CertificateItem } from "@/types";

export function getCertificates(): CertificateItem[] {
  return [
    {
      title: "PPE Awareness",
      status: "Valid",
      issueDate: "Jan 12, 2026",
      expiryDate: "Jan 12, 2027",
    },
    {
      title: "Incident Response",
      status: "Valid",
      issueDate: "Feb 3, 2026",
      expiryDate: "Feb 3, 2027",
    },
    {
      title: "Chemical Handling",
      status: "Pending Review",
      issueDate: "Mar 17, 2026",
      expiryDate: "Mar 17, 2027",
    },
    {
      title: "Workplace Ergonomics",
      status: "Valid",
      issueDate: "Apr 8, 2026",
      expiryDate: "Apr 8, 2027",
    },
  ];
}
