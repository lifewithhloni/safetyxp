import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type InvitationRecord = {
  id: string;
  companyId: string;
  employeeId: string;
  email: string;
  tokenHash: string;
  rawToken: string;
  expiresAt: string;
  acceptedAt?: string | null;
  status: InvitationStatus;
  createdAt: string;
  invitedBy: string;
};

export function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createInvitation({
  companyId,
  employeeId,
  email,
  invitedBy,
  expiresInDays = 7,
}: {
  companyId: string;
  employeeId: string;
  email: string;
  invitedBy: string;
  expiresInDays?: number;
}) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: randomUUID(),
    companyId,
    employeeId,
    email,
    rawToken,
    tokenHash: hashToken(rawToken),
    expiresAt,
    acceptedAt: null,
    status: "PENDING" as const,
    createdAt: new Date().toISOString(),
    invitedBy,
  } satisfies InvitationRecord;
}

export function getInvitationStatus(invitation: Pick<InvitationRecord, "status" | "expiresAt" | "acceptedAt">) {
  if (invitation.status === "REVOKED") return "REVOKED";
  if (invitation.status === "ACCEPTED") return "ACCEPTED";
  if (new Date(invitation.expiresAt).getTime() < Date.now()) return "EXPIRED";
  return invitation.status ?? "PENDING";
}

export function acceptInvitation({
  invitation,
  suppliedToken,
}: {
  invitation: Pick<InvitationRecord, "status" | "expiresAt" | "tokenHash" | "acceptedAt">;
  suppliedToken: string;
}) {
  if (invitation.status === "REVOKED") {
    throw new Error("This invitation has been revoked.");
  }

  if (invitation.status === "ACCEPTED") {
    throw new Error("This invitation has already been accepted.");
  }

  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    throw new Error("This invitation has expired.");
  }

  const providedHash = hashToken(suppliedToken);
  const expected = Buffer.from(invitation.tokenHash, "hex");
  const actual = Buffer.from(providedHash, "hex");
  const valid = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!valid) {
    throw new Error("Invalid invitation token.");
  }

  return {
    accepted: true,
    status: "ACCEPTED" as const,
    acceptedAt: new Date().toISOString(),
  };
}
