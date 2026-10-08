import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  acceptEmployeeInvitation,
  EmployeeInvitationError,
} from "@/services/admin/employee-invitation.service";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const invitationId = isObject(body) ? body.invitationId : null;
  if (typeof invitationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) {
    return Response.json({ error: "A valid employee invitation is required." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Sign in through your employee invitation before activating it." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return Response.json({ error: "Could not verify the employee profile." }, { status: 500 });
  }
  if (!profile || profile.role !== "employee") {
    return Response.json({ error: "An employee profile is required to activate this invitation." }, { status: 403 });
  }

  try {
    return Response.json(await acceptEmployeeInvitation(invitationId, user.id));
  } catch (error) {
    if (error instanceof EmployeeInvitationError) {
      const status = error.code === "forbidden" ? 403
        : error.code === "expired" ? 410
          : error.code === "revoked" || error.code === "invalid" ? 400
            : 500;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Employee invitation could not be activated." }, { status: 500 });
  }
}
