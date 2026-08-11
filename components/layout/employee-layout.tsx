import { AppShell } from "@/components/layout/app-shell";

export function EmployeeLayout({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <AppShell title={title} description={description}>
      {children}
    </AppShell>
  );
}
