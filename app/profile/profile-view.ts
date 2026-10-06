import type { Company, User } from "@/types/auth";

export function getProfileView(user: User | null, company: Company | null) {
  const name = user?.fullName.trim() || user?.email || "Profile unavailable";
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  return {
    name,
    initials,
    email: user?.email || "Not provided",
    role: user?.role ?? "Not available",
    company: company?.name ?? "Not available",
  };
}
