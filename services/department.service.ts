import { createServerSupabaseClient } from "@/lib/supabase/server";

export type Department = {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
};

export async function getCompanyDepartments(companyId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, company_id, name, created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) {
    return [] as Department[];
  }

  return (data ?? []) as Department[];
}

export async function createDepartment(companyId: string, name: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({ company_id: companyId, name })
    .select("id, company_id, name, created_at")
    .single();

  if (error) {
    return null;
  }

  return data as Department;
}
