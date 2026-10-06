import { createServerSupabaseClient, getCurrentProfile } from "@/lib/supabase/server";
import { getAutomationRules } from "@/services/notifications/notification-rules.service";

export async function getCompanyAutomationOverview() {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return { rules: [], history: [] };
  }

  const supabase = await createServerSupabaseClient();
  const { data: history } = await supabase
    .from("notifications")
    .select("id, user_id, type, channel, status, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    rules: getAutomationRules(),
    history: history ?? [],
  };
}
