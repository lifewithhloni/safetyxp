import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGetUser = jest.fn<() => Promise<unknown>>();
const mockOrder = jest.fn<() => Promise<unknown>>();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockCreateServerSupabaseClient = jest.fn<() => Promise<unknown>>();
const mockGetCurrentProfile = jest.fn();

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServerSupabaseClient(),
  getCurrentProfile: mockGetCurrentProfile,
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));

import { getEmployeeCertificates } from "@/services/certificates/certificate.service";

describe("getEmployeeCertificates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
    mockCreateServerSupabaseClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    });
  });

  it("uses the verified auth user ID without an additional profile query", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "authenticated-user" } },
      error: null,
    });

    await expect(getEmployeeCertificates()).resolves.toEqual([]);

    expect(mockCreateServerSupabaseClient).toHaveBeenCalledTimes(1);
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("certificates");
    expect(mockEq).toHaveBeenCalledWith("employee_id", "authenticated-user");
    expect(mockGetCurrentProfile).not.toHaveBeenCalled();
  });

  it("returns no certificates when there is no authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(getEmployeeCertificates()).resolves.toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
