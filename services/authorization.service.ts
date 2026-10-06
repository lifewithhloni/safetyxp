export type UserRole = "employee" | "admin" | "super_admin";

export type AuthorizationContext = {
  userId: string;
  companyId: string;
  role: UserRole;
  companyName?: string;
};

export type CompanyContextInput = {
  companyId?: string | null;
  role?: string | null;
};

export function sanitizeCompanyContext(input: CompanyContextInput, serverContext: AuthorizationContext) {
  return {
    companyId: serverContext.companyId,
    role: serverContext.role,
  };
}

export function canAccessCompany(context: AuthorizationContext, companyId: string | null | undefined) {
  if (!companyId) {
    return false;
  }

  return context.companyId === companyId;
}

export function canAccessRoute(context: AuthorizationContext, pathname: string) {
  if (pathname.startsWith("/admin")) {
    return context.role === "admin" || context.role === "super_admin";
  }

  return context.companyId !== "";
}

export function requireRole(requiredRole: UserRole, context: AuthorizationContext) {
  if (context.role !== requiredRole && context.role !== "super_admin") {
    throw new Error("Unauthorized");
  }

  return true;
}

export function getCurrentUserRole(context: AuthorizationContext) {
  return context.role;
}

export function isCompanyAdmin(context: AuthorizationContext) {
  return context.role === "admin" || context.role === "super_admin";
}

export function isCompanyEmployee(context: AuthorizationContext) {
  return context.role === "employee";
}
