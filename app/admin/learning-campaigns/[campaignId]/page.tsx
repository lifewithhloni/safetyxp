import { notFound } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { CampaignDetail } from "@/components/admin/campaign-detail";
import {
  CampaignManagementError,
  getCampaignLearningModules,
  getCompanyCampaignById,
  type CampaignRecord,
  type LearningModuleRecord,
} from "@/services/admin/campaign-management.service";
import {
  EmployeeAccessError,
  redirectForEmployeeAccessError,
} from "@/services/admin/employee-management.service";
type PageProps = {
  params: Promise<{ campaignId: string }>;
};

function CampaignLoadError() {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      <h2 className="font-semibold">Campaign details could not be loaded</h2>
      <p className="mt-1">Please try again. Campaign data has not been changed.</p>
    </div>
  );
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { campaignId } = await params;
  let campaign: CampaignRecord | null = null;
  let modules: LearningModuleRecord[] = [];
  let failedToLoad = false;

  try {
    campaign = await getCompanyCampaignById(campaignId);
    modules = await getCampaignLearningModules(campaign.id);
  } catch (error) {
    if (error instanceof EmployeeAccessError) {
      redirectForEmployeeAccessError(error);
    }
    if (error instanceof CampaignManagementError && error.code === "not_found") {
      notFound();
    }
    failedToLoad = true;
  }

  if (failedToLoad || !campaign) {
    return (
      <AdminShell
        title="Campaign"
        description="Campaign details and learning modules."
        breadcrumb={["Admin", "Learning Campaigns"]}
      >
        <CampaignLoadError />
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title={campaign.name}
      description="Campaign details and learning modules."
      breadcrumb={["Admin", "Learning Campaigns", campaign.name]}
    >
      <CampaignDetail campaign={campaign} modules={modules} />
    </AdminShell>
  );
}
