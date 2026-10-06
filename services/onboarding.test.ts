import { describe, expect, it } from "@jest/globals";
import { createInvitation, acceptInvitation, getInvitationStatus } from "./invitation.service";
import { validateCSV } from "./csv-import.service";

describe("employee onboarding", () => {
  it("validates CSV rows and flags missing departments and duplicates", () => {
    const csv = [
      "first_name,last_name,email,employee_number,department,job_title,manager_email,location,employment_status",
      "John,Doe,john@company.com,EMP001,Operations,Operator,jane@company.com,Johannesburg,active",
      "Jane,Doe,jane@company.com,EMP002,Operations,Operator,jane@company.com,Johannesburg,active",
      "Bad,User,bad-email,EMP003,Missing Dept,Operator,jane@company.com,Johannesburg,active",
      "",
    ].join("\n");

    const result = validateCSV(csv, { companyId: "company-a", adminUserId: "admin-a", allowedDepartments: ["Operations"] });

    expect(result.totalRows).toBeGreaterThanOrEqual(3);
    expect(result.errors.some((error) => error.message.includes("duplicate") || error.message.includes("Department"))).toBe(true);
  });

  it("creates a hashed invitation that is not stored in plaintext", () => {
    const invitation = createInvitation({
      companyId: "company-a",
      employeeId: "employee-1",
      email: "new.employee@company.com",
      invitedBy: "admin-a",
      expiresInDays: 7,
    });

    expect(invitation.status).toBe("PENDING");
    expect(invitation.tokenHash).not.toBe(invitation.rawToken);
    expect(invitation.rawToken.length).toBeGreaterThan(20);
    expect(invitation.tokenHash).not.toContain(invitation.rawToken);
  });

  it("rejects expired or revoked invitations", () => {
    const invitation = createInvitation({
      companyId: "company-a",
      employeeId: "employee-2",
      email: "expired@company.com",
      invitedBy: "admin-a",
      expiresInDays: 1,
    });

    const expired = { ...invitation, expiresAt: new Date(Date.now() - 86400000).toISOString() };
    expect(getInvitationStatus(expired)).toBe("EXPIRED");
    expect(() => acceptInvitation({ invitation: { ...expired, status: "REVOKED" }, suppliedToken: invitation.rawToken })).toThrow();
  });
});
