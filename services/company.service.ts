import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getCompany(companyId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, industry, logo_url, created_at, updated_at")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Company;
}

export async function updateCompany(companyId: string, updates: Partial<Company>) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)
    .select("id, name, industry, logo_url, created_at, updated_at")
    .single();

  if (error) {
    return null;
  }

  return data as Company;
}

export async function getCurrentCompany() {
  const { getCurrentProfile } = await import("@/lib/supabase/server");
  const profile = await getCurrentProfile();

  if (!profile?.company_id) {
    return null;
  }

  return getCompany(profile.company_id);
}

export async function getCompanyMembers(companyId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, company_id, department_id, employee_number")
    .eq("company_id", companyId)
    .order("last_name", { ascending: true });

  if (error) {
    return [];
  }

  return data ?? [];
}

export async function getCompanyDepartments(companyId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, company_id, name, created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    return [];
  }

  return data ?? [];
}
