import { AdminLayout } from "@/components/layout/admin-layout";

export function AdminShell({
  children,
  title = "Dashboard",
  description = "Overview of the learning operations workspace.",
  breadcrumb = ["Admin", "Dashboard"],
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  breadcrumb?: string[];
}) {
  return (
    <AdminLayout title={title} description={description} breadcrumb={breadcrumb}>
      {children}
    </AdminLayout>
  );
}
