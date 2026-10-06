import type { UserRole } from "@/types/auth";

export const employeeNavItems = [
  { href: "/today", label: "Today" },
  { href: "/lesson", label: "Learning" },
  { href: "/certificates", label: "Certificates" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export function getNavigationItemsForRole(role: UserRole | null) {
  return employeeNavItems.filter(
    (item) => item.href !== "/admin" || role === "admin" || role === "super_admin"
  );
}
