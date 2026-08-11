"use client";

import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types/auth";

export function RoleGuard({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
