import Link from "next/link";
import type {
  CampaignRecord,
  LearningModuleRecord,
} from "@/services/admin/campaign-management.service";
import { CampaignModuleManager } from "@/components/admin/campaign-module-manager";

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CampaignDetail({
  campaign,
  modules,
}: {
  campaign: CampaignRecord;
  modules: LearningModuleRecord[];
}) {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/learning-campaigns"
        className="inline-flex min-h-10 items-center rounded-lg pr-3 text-sm font-semibold text-[#0b3d91] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <span aria-hidden="true" className="mr-2 text-lg">←</span>
        All campaigns
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0b3d91]">Campaign details</p>
            <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-950">{campaign.name}</h2>
            {campaign.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{campaign.description}</p>
            ) : null}
          </div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {formatStatus(campaign.status)}
          </span>
        </div>

        <dl className="mt-7 grid gap-x-8 gap-y-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Official deadline</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(campaign.official_deadline)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Learning deadline</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(campaign.learning_deadline)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Buffer</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {campaign.buffer_days} {campaign.buffer_days === 1 ? "day" : "days"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(campaign.created_at)}</dd>
          </div>
        </dl>
      </section>

      <CampaignModuleManager campaignId={campaign.id} initialModules={modules} />
    </div>
  );
}
