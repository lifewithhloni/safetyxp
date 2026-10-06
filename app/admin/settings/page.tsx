import { AdminShell } from "@/features/admin/admin-shell";
import { getCompanyAutomationOverview } from "@/services/automation/automation-settings.service";

export default async function AdminSettingsPage() {
  const overview = await getCompanyAutomationOverview();

  return (
    <AdminShell title="Automation Settings" description="Manage compliance reminders, channels, and recent notification history." breadcrumb={["Admin", "Settings"]}>
      <div className="space-y-6">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Automation</h2>
          <p className="mt-2 text-sm text-slate-600">These rules drive in-app and email notifications for compliance events.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Automation</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Audience</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {overview.rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-3">{rule.name}</td>
                    <td className="px-4 py-3">{rule.eventType}</td>
                    <td className="px-4 py-3">{rule.audience.join(", ")}</td>
                    <td className="px-4 py-3">{rule.channels.join(" + ")}</td>
                    <td className="px-4 py-3">{rule.frequency}</td>
                    <td className="px-4 py-3">{rule.enabled ? "Enabled" : "Disabled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Notification History</h2>
          <p className="mt-2 text-sm text-slate-600">Recent delivery records for this company.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {overview.history.map((item: { id: string; user_id: string; type: string; channel: string; status: string; created_at: string }) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{item.user_id}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">{item.channel}</td>
                    <td className="px-4 py-3 uppercase">{item.status}</td>
                    <td className="px-4 py-3">{new Date(item.created_at).toLocaleString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
