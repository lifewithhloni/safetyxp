import { EmployeeLayout } from "@/components/layout/employee-layout";

export function EmployeeShell({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <EmployeeLayout title={title} description={description}>
      {children}
    </EmployeeLayout>
  );
}
