import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGetUser = jest.fn<() => Promise<unknown>>();
const mockOrder = jest.fn<() => Promise<unknown>>();
const mockEmployeeIdEq = jest.fn();
const mockStatusEq = jest.fn();
const mockLimit = jest.fn();
const mockMaybeSingle = jest.fn<() => Promise<unknown>>();
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

import {
  getEmployeeCertificates,
  hasIssuedEmployeeCertificate,
} from "@/services/certificates/certificate.service";

describe("getEmployeeCertificates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockStatusEq.mockReturnValue({ limit: mockLimit });
    mockEmployeeIdEq.mockReturnValue({ order: mockOrder, eq: mockStatusEq });
    mockSelect.mockReturnValue({ eq: mockEmployeeIdEq });
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
    expect(mockEmployeeIdEq).toHaveBeenCalledWith("employee_id", "authenticated-user");
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

  it("checks only for an issued certificate belonging to the verified auth user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "authenticated-user" } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: { id: "issued-certificate" }, error: null });

    await expect(hasIssuedEmployeeCertificate()).resolves.toBe(true);

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("certificates");
    expect(mockSelect).toHaveBeenCalledWith("id");
    expect(mockEmployeeIdEq).toHaveBeenCalledWith("employee_id", "authenticated-user");
    expect(mockStatusEq).toHaveBeenCalledWith("status", "issued");
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("does not query for an issued certificate when there is no authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(hasIssuedEmployeeCertificate()).resolves.toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("surfaces a safe error when the summary query fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "authenticated-user" } },
      error: null,
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "private provider details" } });

    await expect(hasIssuedEmployeeCertificate()).rejects.toThrow(
      "Could not check employee certificate availability."
    );
  });
});
