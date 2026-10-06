import { createServerSupabaseClient, getCurrentProfile } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    throw new Error("Forbidden");
  }

  return profile;
}

async function getContentOwnedByAdminCompany(contentId: string, companyId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("generated_content")
    .select("id, company_id, policy_id, campaign_id, content_type, content, status, source_document_id, created_by")
    .eq("id", contentId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Generated content not found.");
  }

  return data;
}

export async function approveGeneratedContent(contentId: string, notes?: string) {
  const profile = await requireAdmin();
  const content = await getContentOwnedByAdminCompany(contentId, profile.company_id);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("generated_content")
    .update({ status: "APPROVED", updated_at: new Date().toISOString() })
    .eq("id", content.id)
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabaseAdmin.from("content_reviews").insert({
    generated_content_id: content.id,
    reviewer_id: profile.id,
    status: "approved",
    notes: notes ?? null,
    reviewed_at: new Date().toISOString(),
  });

  return data;
}

export async function rejectGeneratedContent(contentId: string, notes: string) {
  const profile = await requireAdmin();
  const content = await getContentOwnedByAdminCompany(contentId, profile.company_id);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("generated_content")
    .update({ status: "REJECTED", updated_at: new Date().toISOString() })
    .eq("id", content.id)
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabaseAdmin.from("content_reviews").insert({
    generated_content_id: content.id,
    reviewer_id: profile.id,
    status: "rejected",
    notes,
    reviewed_at: new Date().toISOString(),
  });

  return data;
}

export async function publishGeneratedContent(contentId: string) {
  const profile = await requireAdmin();
  const content = await getContentOwnedByAdminCompany(contentId, profile.company_id);

  if (content.status !== "APPROVED") {
    throw new Error("Only approved content can be published.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("generated_content")
    .update({ status: "PUBLISHED", updated_at: new Date().toISOString() })
    .eq("id", content.id)
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function regenerateGeneratedContent(contentId: string) {
  const profile = await requireAdmin();
  const content = await getContentOwnedByAdminCompany(contentId, profile.company_id);

  const currentVersion = Number((content.content as { version?: number } | null)?.version ?? 1);
  const nextVersion = currentVersion + 1;

  const { data, error } = await supabaseAdmin
    .from("generated_content")
    .insert({
      company_id: content.company_id,
      policy_id: content.policy_id,
      campaign_id: content.campaign_id,
      content_type: content.content_type,
      content: {
        ...(typeof content.content === "object" && content.content ? content.content : {}),
        version: nextVersion,
        regenerated_from: content.id,
      },
      status: "UNDER_REVIEW",
      source_document_id: content.source_document_id,
      created_by: profile.id,
    })
    .select("id, status, content_type, content")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to regenerate content.");
  }

  await supabaseAdmin.from("audit_logs").insert({
    company_id: profile.company_id,
    user_id: profile.id,
    action: "Content Regenerated",
    entity_type: "generated_content",
    entity_id: data.id,
    metadata: { previousContentId: content.id, nextVersion },
  });

  return data;
}
