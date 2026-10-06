import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";

const enforceRateLimit = jest.fn(() => null) as jest.MockedFunction<() => null>;
const enforceSameOriginForMutations = jest.fn(() => null) as jest.MockedFunction<() => null>;
const requireAuthenticatedRole = jest.fn() as jest.MockedFunction<
  () => Promise<{ profile: { id: string; company_id: string; role: string } | null; response: Response | null }>
>;
const safeErrorResponse = jest.fn((status: number, message: string) =>
  Response.json({ error: message }, { status })
) as jest.MockedFunction<(status: number, message: string) => Response>;
const reportUnexpectedApiError = jest.fn() as jest.MockedFunction<(error: unknown, operation: string) => void>;
const safeForbiddenOrNotFound = jest.fn(() =>
  Response.json({ error: "Not found." }, { status: 404 })
) as jest.MockedFunction<() => Response>;

const revokeCertificate = jest.fn() as jest.MockedFunction<
  (certificateId: string, reason: string) => Promise<{ id: string; status: string }>
>;

jest.mock("@/lib/security/api-security", () => ({
  enforceRateLimit,
  enforceSameOriginForMutations,
  requireAuthenticatedRole,
  safeErrorResponse,
  safeForbiddenOrNotFound,
  reportUnexpectedApiError,
}));

jest.mock("@/services/certificates/certificate.service", () => ({
  revokeCertificate,
}));

import { POST } from "./route";

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("https://example.com/api/certificates/cert-123/revoke", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      host: "example.com",
      "x-forwarded-for": "203.0.113.15",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("certificate revoke route contract", () => {
  const adminProfile = { id: "admin-1", company_id: "company-a", role: "admin" };
  const employeeProfile = { id: "emp-1", company_id: "company-a", role: "employee" };

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuthenticatedRole.mockReset();
    revokeCertificate.mockReset();
    reportUnexpectedApiError.mockReset();
  });

  it("returns 401 for unauthenticated requests and does not invoke the revoke workflow", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(401, "Unauthorized."),
    });

    const response = await POST(makeRequest({ reason: "Administrative revoke" }), {
      params: Promise.resolve({ certificateId: "cert-123" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(revokeCertificate).not.toHaveBeenCalled();
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("returns the existing forbidden contract for authenticated users without sufficient permissions", async () => {
    requireAuthenticatedRole.mockResolvedValue({
      profile: null,
      response: safeErrorResponse(403, "Forbidden."),
    });

    const response = await POST(makeRequest({ reason: "Not allowed" }), {
      params: Promise.resolve({ certificateId: "cert-123" }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden." });
    expect(revokeCertificate).not.toHaveBeenCalled();
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("rejects cross-company revocation through the actual certificate-service authorization path", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    revokeCertificate.mockRejectedValue(new Error("Unauthorized"));

    const response = await POST(makeRequest({ reason: "Cross-company" }), {
      params: Promise.resolve({ certificateId: "cert-123" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(revokeCertificate).toHaveBeenCalledWith("cert-123", "Cross-company");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("returns the existing not-found contract for malformed or missing certificate IDs", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    revokeCertificate.mockRejectedValue(new Error("Certificate not found."));

    const response = await POST(makeRequest({ reason: "Missing certificate" }), {
      params: Promise.resolve({ certificateId: "not-a-valid-id" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(revokeCertificate).toHaveBeenCalledWith("not-a-valid-id", "Missing certificate");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("revokes a valid authorized certificate using the current success contract", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    revokeCertificate.mockResolvedValue({ id: "cert-123", status: "revoked" });

    const response = await POST(makeRequest({ reason: "Policy violation" }), {
      params: Promise.resolve({ certificateId: "cert-123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      certificate: { id: "cert-123", status: "revoked" },
    });
    expect(revokeCertificate).toHaveBeenCalledWith("cert-123", "Policy violation");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });

  it("returns the generic not-found response for unexpected service failures without leaking sensitive data to Sentry", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: adminProfile, response: null });
    revokeCertificate.mockRejectedValue(new Error("Storage connection failed: token=secret, email=admin@example.com"));

    const response = await POST(makeRequest({ reason: "Unexpected failure" }), {
      params: Promise.resolve({ certificateId: "cert-123" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
    expect(revokeCertificate).toHaveBeenCalledWith("cert-123", "Unexpected failure");
  });

  it("keeps Sentry payloads free of authorization metadata, tokens, cookies, emails, and certificate details", async () => {
    requireAuthenticatedRole.mockResolvedValue({ profile: employeeProfile, response: null });
    revokeCertificate.mockRejectedValue(
      new Error("https://storage.example.com/cert?token=secret&email=employee@example.com&cookie=SESSION=abc")
    );

    const response = await POST(makeRequest({ reason: "Sensitive rejection" }), {
      params: Promise.resolve({ certificateId: "cert-123" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(revokeCertificate).toHaveBeenCalledWith("cert-123", "Sensitive rejection");
    expect(reportUnexpectedApiError).not.toHaveBeenCalled();
  });
});
