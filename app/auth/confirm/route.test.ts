import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  expireEmployeeInvitation,
  getEmployeeInvitationByTokenHash,
} from "@/services/admin/employee-invitation.service";
import { GET } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock("@/services/admin/employee-invitation.service", () => ({
  EmployeeInvitationError: class EmployeeInvitationError extends Error {
    constructor(readonly code: string, message: string) { super(message); }
  },
  expireEmployeeInvitation: jest.fn(),
  getEmployeeInvitationByTokenHash: jest.fn(),
}));

const verifyOtp = jest.fn(async () => ({ error: null }));

describe("auth confirmation invitation routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { verifyOtp },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
    verifyOtp.mockResolvedValue({ error: null });
    jest.mocked(getEmployeeInvitationByTokenHash).mockResolvedValue(null);
    jest.mocked(expireEmployeeInvitation).mockResolvedValue(undefined);
  });

  it("preserves the existing company-admin invite confirmation flow", async () => {
    const request = new NextRequest(
      "https://safetyxp.example/auth/confirm?token_hash=admin-hash&type=invite&next=%2Freset-password"
    );

    const response = await GET(request);

    expect(verifyOtp).toHaveBeenCalledWith({ type: "invite", token_hash: "admin-hash" });
    expect(response.headers.get("location")).toBe("https://safetyxp.example/reset-password");
  });

  it("routes a persisted employee invitation to its associated password setup", async () => {
    jest.mocked(getEmployeeInvitationByTokenHash).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      employee_id: "employee-1",
      status: "PENDING",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const request = new NextRequest(
      "https://safetyxp.example/auth/confirm?token_hash=employee-hash&type=invite&next=%2Fadmin"
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://safetyxp.example/reset-password?invitation=11111111-1111-4111-8111-111111111111"
    );
  });

  it("expires an invitation whose persisted expiry has passed without verifying its token", async () => {
    jest.mocked(getEmployeeInvitationByTokenHash).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      employee_id: "employee-1",
      status: "PENDING",
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const request = new NextRequest(
      "https://safetyxp.example/auth/confirm?token_hash=employee-hash&type=invite"
    );

    const response = await GET(request);

    expect(expireEmployeeInvitation).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://safetyxp.example/login?error=invitation-expired"
    );
  });
});
