import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAuthenticatedRole, safeForbiddenOrNotFound } from "@/lib/security/api-security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await requireAuthenticatedRole(["admin", "super_admin"]);
  if (auth.response) {
    return auth.response;
  }

  if (!auth.profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = auth.profile;

  const { jobId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ai_generation_jobs")
    .select("id, status, last_message, created_at, updated_at, policy_id, policy_document_id")
    .eq("id", jobId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (error || !data) {
    return safeForbiddenOrNotFound();
  }

  return NextResponse.json({ success: true, job: data }, { status: 200 });
}
