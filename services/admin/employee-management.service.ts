import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/auth-utils";
import type { EmployeeListItem } from "@/types/admin-employee";

type EmployeeProfileRow = {
  id: string;
  company_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string | null;
  job_title: string | null;
  employee_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type DepartmentRow = {
  id: string;
  company_id: string;
  name: string;
};

export class EmployeeAccessError extends Error {
  constructor(readonly reason: "unauthenticated" | "forbidden") {
    super(reason === "unauthenticated" ? "Authentication required." : "Company admin access required.");
    this.name = "EmployeeAccessError";
  }
}

export async function getCompanyAdminSupabase() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error("Could not verify the authenticated user.");
  }

  if (!user) {
    throw new EmployeeAccessError("unauthenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id, role, first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error("Could not verify Company Admin access.");
  }

  if (!profile || !profile.company_id || !isAdminRole(profile.role)) {
    throw new EmployeeAccessError("forbidden");
  }

  return { supabase, profile };
}

export function filterEmployeesBySearch(employees: EmployeeListItem[], search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  if (!normalizedSearch) {
    return employees;
  }

  return employees.filter((employee) =>
    [
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.employeeNumber ?? "",
    ].some((value) => value.toLowerCase().includes(normalizedSearch))
  );
}

function toEmployeeListItem(
  profile: EmployeeProfileRow,
  departmentNames: Map<string, string>
): EmployeeListItem {
  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: profile.email,
    departmentId: profile.department_id,
    departmentName: profile.department_id
      ? departmentNames.get(profile.department_id) ?? null
      : null,
    jobTitle: profile.job_title,
    employeeNumber: profile.employee_number,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export async function getCompanyEmployeeDirectory(input: {
  search?: string;
  departmentId?: string;
} = {}) {
  const { supabase, profile } = await getCompanyAdminSupabase();
  const { data: departmentRows, error: departmentsError } = await supabase
    .from("departments")
    .select("id, company_id, name")
    .eq("company_id", profile.company_id)
    .order("name", { ascending: true });

  if (departmentsError) {
    throw new Error("Could not load company departments.");
  }

  const departments = (departmentRows ?? []) as DepartmentRow[];
  const selectedDepartment = input.departmentId
    ? departments.find((department) => department.id === input.departmentId)
    : undefined;

  if (input.departmentId && !selectedDepartment) {
    return { employees: [], departments: departments.map(({ id, name }) => ({ id, name })) };
  }

  let employeeQuery = supabase
    .from("profiles")
    .select("id, company_id, role, first_name, last_name, email, department_id, job_title, employee_number, avatar_url, created_at, updated_at")
    .eq("company_id", profile.company_id)
    .eq("role", "employee")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (selectedDepartment) {
    employeeQuery = employeeQuery.eq("department_id", selectedDepartment.id);
  }

  const { data: employeeRows, error: employeesError } = await employeeQuery;
  if (employeesError) {
    throw new Error("Could not load company employees.");
  }

  const departmentNames = new Map(departments.map(({ id, name }) => [id, name]));
  const employees = ((employeeRows ?? []) as EmployeeProfileRow[]).map((employee) =>
    toEmployeeListItem(employee, departmentNames)
  );

  return {
    employees: filterEmployeesBySearch(employees, input.search ?? ""),
    departments: departments.map(({ id, name }) => ({ id, name })),
  };
}

export async function getCompanyEmployee(employeeId: string): Promise<EmployeeListItem | null> {
  const { supabase, profile } = await getCompanyAdminSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, company_id, role, first_name, last_name, email, department_id, job_title, employee_number, avatar_url, created_at, updated_at")
    .eq("id", employeeId)
    .eq("company_id", profile.company_id)
    .eq("role", "employee")
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the employee profile.");
  }

  if (!data) {
    return null;
  }

  const employee = data as EmployeeProfileRow;
  if (employee.company_id !== profile.company_id || employee.role !== "employee") {
    return null;
  }

  let departmentName: string | null = null;
  if (employee.department_id) {
    const { data: department, error: departmentError } = await supabase
      .from("departments")
      .select("id, company_id, name")
      .eq("id", employee.department_id)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (departmentError) {
      throw new Error("Could not load the employee department.");
    }

    if (department && department.company_id === profile.company_id) {
      departmentName = department.name;
    }
  }

  return toEmployeeListItem({ ...employee, company_id: profile.company_id }, new Map(
    departmentName && employee.department_id
      ? [[employee.department_id, departmentName]]
      : []
  ));
}

export function redirectForEmployeeAccessError(error: unknown): never {
  if (error instanceof EmployeeAccessError && error.reason === "unauthenticated") {
    redirect("/login");
  }

  if (error instanceof EmployeeAccessError && error.reason === "forbidden") {
    redirect("/today");
  }

  throw error;
}
