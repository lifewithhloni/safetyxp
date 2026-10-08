"use client";

import { useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { CampaignWizard } from "@/components/admin/campaign-wizard";
import { CampaignDirectory } from "@/components/admin/campaign-directory";

export default function LearningCampaignsPage() {
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  return (
    <AdminShell
      title={creatingCampaign ? "Create Learning Campaign" : "Learning Campaigns"}
      description={creatingCampaign
        ? "Upload a policy and let AI create an engaging learning experience for your employees."
        : "View your company's learning campaigns."}
      breadcrumb={creatingCampaign
        ? ["Admin", "Learning Campaigns", "Create"]
        : ["Admin", "Learning Campaigns"]}
    >
      {creatingCampaign ? (
        <div>
          <button
            type="button"
            onClick={() => setCreatingCampaign(false)}
            className="mb-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to campaigns
          </button>
          <CampaignWizard />
        </div>
      ) : (
        <CampaignDirectory onCreateCampaign={() => setCreatingCampaign(true)} />
      )}
    </AdminShell>
  );
}
