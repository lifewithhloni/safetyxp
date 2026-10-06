import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/server";
import { reportServerError } from "@/lib/security/sentry-server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const globalState = globalThis as typeof globalThis & {
  __safetyxpRateLimit?: Map<string, RateLimitBucket>;
};

const rateLimitStore = globalState.__safetyxpRateLimit ?? new Map<string, RateLimitBucket>();
globalState.__safetyxpRateLimit = rateLimitStore;

export type GuardedRole = "employee" | "admin" | "super_admin";

export function safeErrorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function safeForbiddenOrNotFound() {
  return safeErrorResponse(404, "Not found.");
}

export function reportUnexpectedApiError(error: unknown, operation: string) {
  reportServerError(error, { component: "api", operation, runtime: "nodejs" });
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function enforceSameOriginForMutations(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return safeErrorResponse(403, "Forbidden.");
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  if (!host) {
    return safeErrorResponse(403, "Forbidden.");
  }

  const expectedOrigin = `${protocol}://${host}`;
  if (origin !== expectedOrigin) {
    return safeErrorResponse(403, "Forbidden.");
  }

  return null;
}

export function enforceRateLimit(input: {
  request: NextRequest;
  key: string;
  maxRequests: number;
  windowMs: number;
}) {
  const ip = getClientIp(input.request);
  const bucketKey = `${input.key}:${ip}`;
  const now = Date.now();
  const current = rateLimitStore.get(bucketKey);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(bucketKey, {
      count: 1,
      resetAt: now + input.windowMs,
    });
    return null;
  }

  if (current.count >= input.maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  current.count += 1;
  rateLimitStore.set(bucketKey, current);
  return null;
}

export async function requireAuthenticatedRole(roles: GuardedRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { profile: null, response: safeErrorResponse(401, "Unauthorized.") };
  }

  if (!roles.includes(profile.role as GuardedRole)) {
    return { profile: null, response: safeErrorResponse(403, "Forbidden.") };
  }

  if (!profile.company_id) {
    return { profile: null, response: safeErrorResponse(403, "Forbidden.") };
  }

  return { profile, response: null };
}