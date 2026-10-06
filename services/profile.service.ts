import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  company_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "employee" | "admin" | "super_admin";
  job_title: string | null;
  department_id: string | null;
  employee_number: string | null;
  avatar_url: string | null;
};

export async function getCurrentUserProfile() {
  const { getCurrentProfile } = await import("@/lib/supabase/server");
  return getCurrentProfile();
}

export async function getCurrentUserRole() {
  const profile = await getCurrentUserProfile();
  return profile?.role ?? null;
}

export async function updateProfile(profileId: string, updates: Partial<Profile>) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId)
    .select("id, company_id, email, first_name, last_name, role, job_title, department_id, employee_number, avatar_url")
    .single();

  if (error) {
    return null;
  }

  return data as Profile;
}
