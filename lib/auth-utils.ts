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

export function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "super_admin";
}

export function isAdminRoutePath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isProtectedRoutePath(pathname: string) {
  return isAdminRoutePath(pathname) || protectedRoutes.includes(pathname);
}

export function getRedirectTargetForRole(role: UserRole | null | undefined) {
  if (isAdminRole(role)) {
    return "/admin/dashboard";
  }

  return "/today";
}

export function canAccessRoute(context: AuthContext, pathname: string) {
  if (!context.user || !context.profile || !context.company) {
    return false;
  }

  if (isAdminRoutePath(pathname)) {
    return isAdminRole(context.profile.role);
  }

  return true;
}
