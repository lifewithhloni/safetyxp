import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const enforceRateLimit = jest.fn(() => null) as jest.MockedFunction<() => null>;
const requireAuthenticatedRole = jest.fn() as jest.MockedFunction<
  () => Promise<{ profile: { id: string; company_id: string; role: string } | null; response: Response | null }>
>;
const safeForbiddenOrNotFound = jest.fn(() =>
  Response.json({ error: "Not found." }, { status: 404 })
) as jest.MockedFunction<() => Response>;
const reportUnexpectedApiError = jest.fn() as jest.MockedFunction<(error: unknown, operation: string) => void>;
const safeErrorResponse = jest.fn((status: number, message: string) =>
  Response.json({ error: message }, { status })
) as jest.MockedFunction<(status: number, message: string) => Response>;

const getCertificateDownloadUrl = jest.fn() as jest.MockedFunction<(certificateId: string) => Promise<string>>;

jest.mock("@/lib/security/api-security", () => ({
  enforceRateLimit,
  requireAuthenticatedRole,
  safeForbiddenOrNotFound,
  reportUnexpectedApiError,
  safeErrorResponse,
}));

jest.mock("@/services/certificates/certificate.service", () => ({
  getCertificateDownloadUrl,
}));

import { GET } from "./route";

function makeRequest() {
  return new NextRequest("https://example.com/api/certificates/cert-123/download", {
    method: "GET",
    headers: {
      origin: "https://example.com",
      host: "example.com",
      "x-forwarded-for": "203.0.113.12",
    },
  });
}

describe("certificate download route contract", () => {
  const employeeProfile = { id: "emp-1", company_id: "company-a", role: "employee" };
  const adminProfile = { id: "admin-1", company_id: "company-a", role: "admin" };

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuthenticatedRole.mockReset();
    getCertificateDownloadUrl.mockReset();
    reportUnexpectedApiError.mockReset();
  });

  it("returns 401 for unauthenticated requests and does not attempt certificate download", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(401, "Unauthorized."),
    });

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "cert-123" }) });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(getCertificateDownloadUrl).not.toHaveBeenCalled();
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("returns the current forbidden contract for authenticated users without the required permission", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(403, "Forbidden."),
    });

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "cert-123" }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden." });
    expect(getCertificateDownloadUrl).not.toHaveBeenCalled();
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("rejects cross-company certificate access through the actual route lookup path", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: employeeProfile, response: null });
    getCertificateDownloadUrl.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "cert-123" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(getCertificateDownloadUrl).toHaveBeenCalledWith("cert-123");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("returns the existing not-found response for missing or non-existent certificate IDs", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    getCertificateDownloadUrl.mockRejectedValue(new Error("Certificate not found."));

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "missing-cert" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(getCertificateDownloadUrl).toHaveBeenCalledWith("missing-cert");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("redirects a valid same-company certificate request to the signed download URL", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    getCertificateDownloadUrl.mockResolvedValue("https://storage.example.com/certificates/company-a/cert-123.pdf?X-Amz-Signature=abc123");

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "cert-123" }) });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://storage.example.com/certificates/company-a/cert-123.pdf?X-Amz-Signature=abc123");
    expect(getCertificateDownloadUrl).toHaveBeenCalledWith("cert-123");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("returns the current not-found handling for storage or signed-URL failures without leaking sensitive values to Sentry", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: employeeProfile, response: null });
    getCertificateDownloadUrl.mockRejectedValue(new Error("Signed URL failed."));

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "cert-123" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
    expect(getCertificateDownloadUrl).toHaveBeenCalledWith("cert-123");
  });

  it("treats malformed certificate IDs like any other downstream lookup failure without validating them in the route", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    getCertificateDownloadUrl.mockRejectedValue(new Error("Malformed certificate id"));

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "not-a-uuid" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(getCertificateDownloadUrl).toHaveBeenCalledWith("not-a-uuid");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("keeps Sentry metadata free of signed URLs, certificate contents, headers, cookies, emails, and storage secrets", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: employeeProfile, response: null });
    getCertificateDownloadUrl.mockRejectedValue(
      new Error("https://signed.example.com/cert?token=secret&email=employee@example.com&cookie=SESSION=abc")
    );

    const response = await GET(makeRequest(), { params: Promise.resolve({ certificateId: "cert-123" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
    expect(getCertificateDownloadUrl).toHaveBeenCalledWith("cert-123");
  });
});
