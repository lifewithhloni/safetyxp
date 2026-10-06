import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CurrentProfile = {
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

type CurrentCompany = {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

const safeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const safeKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "placeholder-publishable-key";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(safeUrl, safeKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component cookies are read-only; ignore in this context.
        }
      },
    },
  });
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, company_id, email, first_name, last_name, role, job_title, department_id, employee_number, avatar_url")
    .eq("id", user.id)
    .maybeSingle<CurrentProfile>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getCurrentCompany() {
  const profile = await getCurrentProfile();

  if (!profile?.company_id) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, industry, logo_url, created_at, updated_at")
    .eq("id", profile.company_id)
    .maybeSingle<CurrentCompany>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getCurrentRole() {
  const profile = await getCurrentProfile();
  return profile?.role ?? null;
}
