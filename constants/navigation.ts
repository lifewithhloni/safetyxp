import type { UserRole } from "@/types/auth";

export const employeeNavItems = [
  { href: "/today", label: "Today" },
  { href: "/lesson", label: "Learning" },
  { href: "/certificates", label: "Certificates" },
  { href: "/profile", label: "Profile" },
  { href: "/admin", label: "Admin" },
];

export const employeeExperienceNavigation = [
  { href: "/today", label: "Home", available: true },
  { href: "/lesson", label: "My Learning", available: true },
  { href: "/today#mission", label: "Missions", available: true },
  { href: "/quick-check", label: "Knowledge Checks", available: true },
  { href: "/certificates", label: "Certificates", available: true },
  { href: "/rewards", label: "Rewards", available: true },
  { href: "/today#progress", label: "My Progress", available: true },
  { href: "/today#resources", label: "Resources", available: true },
  { href: "/help", label: "Help & Support", available: true },
] as const;

export function getNavigationItemsForRole(role: UserRole | null) {
  return employeeNavItems.filter(
    (item) => item.href !== "/admin" || role === "admin" || role === "super_admin"
  );
}
