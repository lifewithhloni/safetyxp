import { AppShell } from "@/components/layout/app-shell";
import { profileData } from "@/lib/mock-data";
import { Building2, Briefcase, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  return (
    <AppShell title="Profile" description="Your employee profile">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0b3d91] text-lg font-semibold text-white">
            MC
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{profileData.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Operations • {profileData.department}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] bg-[#f7f9fc] p-4">
            <div className="flex items-center gap-2 text-[#1565c0]">
              <Building2 size={18} />
              <span className="text-sm font-semibold">Department</span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{profileData.department}</p>
          </div>
          <div className="rounded-[20px] bg-[#f7f9fc] p-4">
            <div className="flex items-center gap-2 text-[#1565c0]">
              <Briefcase size={18} />
              <span className="text-sm font-semibold">Manager</span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{profileData.manager}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#eef4ff] p-5">
          <div className="flex items-center gap-2 text-[#0b3d91]">
            <ShieldCheck size={18} />
            <span className="text-sm font-semibold uppercase tracking-[0.24em]">Compliance</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">{profileData.compliance}</p>
          <p className="mt-2 text-sm text-slate-600">Current level {profileData.level}</p>
        </div>
      </div>
    </AppShell>
  );
}
