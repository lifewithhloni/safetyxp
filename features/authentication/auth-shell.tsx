import { AuthLayout } from "@/components/layout/auth-layout";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
