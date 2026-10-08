import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PendingEmployeeInvitation = {
  id: string;
  employee_id: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expires_at: string;
};

export class EmployeeInvitationError extends Error {
  constructor(
    readonly code: "invalid" | "expired" | "revoked" | "forbidden" | "database",
    message: string
  ) {
    super(message);
    this.name = "EmployeeInvitationError";
  }
}

export async function getEmployeeInvitationByTokenHash(tokenHash: string) {
  const { data, error } = await supabaseAdmin
    .from("employee_invitations")
    .select("id, employee_id, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw new EmployeeInvitationError("database", "Could not verify the employee invitation.");
  }
  return data as PendingEmployeeInvitation | null;
}

export async function expireEmployeeInvitation(invitationId: string) {
  const { error } = await supabaseAdmin
    .from("employee_invitations")
    .update({ status: "EXPIRED" })
    .eq("id", invitationId)
    .eq("status", "PENDING");
  if (error) {
    throw new EmployeeInvitationError("database", "Could not update the expired employee invitation.");
  }
}

export async function acceptEmployeeInvitation(invitationId: string, employeeId: string) {
  const { data: invitation, error: lookupError } = await supabaseAdmin
    .from("employee_invitations")
    .select("id, employee_id, status, expires_at")
    .eq("id", invitationId)
    .maybeSingle();

  if (lookupError) {
    throw new EmployeeInvitationError("database", "Could not verify the employee invitation.");
  }
  if (!invitation || invitation.employee_id !== employeeId) {
    throw new EmployeeInvitationError("forbidden", "This invitation does not belong to the signed-in employee.");
  }
  if (invitation.status === "ACCEPTED") {
    return { accepted: true, alreadyAccepted: true };
  }
  if (invitation.status === "REVOKED") {
    throw new EmployeeInvitationError("revoked", "This employee invitation has been revoked.");
  }
  if (invitation.status === "EXPIRED" || Date.parse(invitation.expires_at) <= Date.now()) {
    if (invitation.status === "PENDING") {
      await expireEmployeeInvitation(invitationId);
    }
    throw new EmployeeInvitationError("expired", "This employee invitation has expired. Ask your company administrator to send another invitation.");
  }
  if (invitation.status !== "PENDING") {
    throw new EmployeeInvitationError("invalid", "This employee invitation is no longer valid.");
  }

  const acceptedAt = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("employee_invitations")
    .update({ status: "ACCEPTED", accepted_at: acceptedAt })
    .eq("id", invitationId)
    .eq("employee_id", employeeId)
    .eq("status", "PENDING")
    .gt("expires_at", acceptedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new EmployeeInvitationError("database", "Could not activate the employee invitation.");
  }
  if (!data) {
    const { data: current, error: currentError } = await supabaseAdmin
      .from("employee_invitations")
      .select("status, employee_id")
      .eq("id", invitationId)
      .maybeSingle();
    if (currentError) {
      throw new EmployeeInvitationError("database", "Could not confirm employee activation.");
    }
    if (current?.employee_id === employeeId && current.status === "ACCEPTED") {
      return { accepted: true, alreadyAccepted: true };
    }
    throw new EmployeeInvitationError("invalid", "This employee invitation is no longer valid.");
  }

  return { accepted: true, alreadyAccepted: false };
}
