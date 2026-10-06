export type UserRole = "employee" | "admin" | "super_admin";

export type AuthContext = {
  user: { id: string; email: string } | null;
  profile: { id: string; company_id: string; role: UserRole } | null;
  company: { id: string; name: string } | null;
};

export const protectedRoutes = [
  "/today",
  "/lesson",
  "/quick-check",
  "/scenario",
  "/mission-complete",
  "/certificates",
  "/profile",
  "/admin",
  "/admin/dashboard",
  "/admin/employees",
  "/admin/campaigns",
  "/admin/policies",
  "/admin/reports",
  "/admin/certificates",
  "/admin/settings",
];

export const adminOnlyRoutes = [
  "/admin",
  "/admin/dashboard",
  "/admin/employees",
  "/admin/campaigns",
  "/admin/policies",
  "/admin/reports",
  "/admin/certificates",
  "/admin/settings",
];

export function getRedirectTargetForRole(role: UserRole | null | undefined) {
  if (role === "admin" || role === "super_admin") {
    return "/admin/dashboard";
  }

  return "/today";
}

export function canAccessRoute(context: AuthContext, pathname: string) {
  if (!context.user || !context.profile || !context.company) {
    return false;
  }

  if (pathname.startsWith("/admin")) {
    return context.profile.role === "admin" || context.profile.role === "super_admin";
  }

  return true;
}
