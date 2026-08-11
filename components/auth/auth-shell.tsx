"use client";

import { AuthProvider } from "@/providers/auth-provider";
import { WorkspaceProvider } from "@/providers/workspace-provider";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </AuthProvider>
  );
}
