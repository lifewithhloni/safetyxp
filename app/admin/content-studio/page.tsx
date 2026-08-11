"use client";

import { AdminShell } from "@/features/admin/admin-shell";
import { AIContentLayout } from "@/components/admin/ai-content-layout";

export default function AIContentStudioPage() {
  return (
    <AdminShell title="AI Content Studio" description="Review and customise the AI-generated learning content before publishing." breadcrumb={["Admin", "Learning Campaigns", "AI Content Studio"]}>
      <AIContentLayout />
    </AdminShell>
  );
}
