import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  EmployeeInvitationError,
  expireEmployeeInvitation,
  getEmployeeInvitationByTokenHash,
} from "@/services/admin/employee-invitation.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    let invitationId: string | null = null;
    if (type === "invite") {
      try {
        const invitation = await getEmployeeInvitationByTokenHash(token_hash);
        if (invitation && invitation.status !== "PENDING") {
          const errorCode = invitation?.status === "EXPIRED" ? "invitation-expired" : "invitation";
          return NextResponse.redirect(new URL(`/login?error=${errorCode}`, request.url));
        }
        if (invitation && Date.parse(invitation.expires_at) <= Date.now()) {
          await expireEmployeeInvitation(invitation.id);
          return NextResponse.redirect(new URL("/login?error=invitation-expired", request.url));
        }
        invitationId = invitation?.id ?? null;
      } catch (invitationError) {
        if (invitationError instanceof EmployeeInvitationError) {
          if (invitationError.code === "database") {
            return NextResponse.json({ error: "Invitation verification is temporarily unavailable." }, { status: 503 });
          }
          return NextResponse.redirect(new URL("/login?error=invitation", request.url));
        }
        throw invitationError;
      }
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      let safeNext = "/";
      if (invitationId) {
        safeNext = `/reset-password?invitation=${encodeURIComponent(invitationId)}`;
      } else {
        const target = new URL(next, request.url);
        if (target.origin === request.nextUrl.origin) {
          safeNext = `${target.pathname}${target.search}${target.hash}`;
        }
      }
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
    if (invitationId) {
      try {
        await expireEmployeeInvitation(invitationId);
      } catch (invitationError) {
        if (invitationError instanceof EmployeeInvitationError) {
          return NextResponse.json({ error: "Invitation status could not be updated." }, { status: 503 });
        }
        throw invitationError;
      }
      return NextResponse.redirect(new URL("/login?error=invitation-expired", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=verification", request.url));
}
