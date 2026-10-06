"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/providers/auth-provider";
import { getProfileView } from "@/app/profile/profile-view";
import { Building2, Briefcase, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const { isLoading, user, company } = useAuth();

  if (isLoading) {
    return (
      <AppShell title="Profile" description="Your employee profile">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
          Loading profile...
        </div>
      </AppShell>
    );
  }

  const profile = getProfileView(user, company);

  return (
    <AppShell title="Profile" description="Your employee profile">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0b3d91] text-lg font-semibold text-white">
            {profile.initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-900">{profile.name}</h2>
            <p className="mt-1 break-words text-sm text-slate-500">{profile.role} • {profile.company}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] bg-[#f7f9fc] p-4">
            <div className="flex items-center gap-2 text-[#1565c0]">
              <Building2 size={18} />
              <span className="text-sm font-semibold">Company</span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{profile.company}</p>
          </div>
          <div className="rounded-[20px] bg-[#f7f9fc] p-4">
            <div className="flex items-center gap-2 text-[#1565c0]">
              <Briefcase size={18} />
              <span className="text-sm font-semibold">Email</span>
            </div>
            <p className="mt-3 break-all text-sm text-slate-700">{profile.email}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#eef4ff] p-5">
          <div className="flex items-center gap-2 text-[#0b3d91]">
            <ShieldCheck size={18} />
            <span className="text-sm font-semibold uppercase tracking-[0.24em]">Role</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-slate-900">{profile.role}</p>
        </div>
      </div>
    </AppShell>
  );
}
