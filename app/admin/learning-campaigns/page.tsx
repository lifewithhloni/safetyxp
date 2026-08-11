"use client";

import { AdminShell } from "@/features/admin/admin-shell";
import { CampaignWizard } from "@/components/admin/campaign-wizard";

export default function LearningCampaignsPage() {
  return (
    <AdminShell title="Create Learning Campaign" description="Upload a policy and let AI create an engaging learning experience for your employees." breadcrumb={["Admin", "Learning Campaigns", "Create"]}>
      <CampaignWizard />
    </AdminShell>
  );
}
