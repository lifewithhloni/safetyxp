"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";

export function AvatarMenu() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, company, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const displayName = user.fullName.trim() || user.email || "Account";
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
    } catch {
      setSignOutError("We couldn't sign you out. Please try again.");
      setIsSigningOut(false);
      return;
    }

    setIsSigningOut(false);
    router.replace("/login");
  }

  return (
    <details className="group relative">
      <summary
        aria-label={`Open account menu for ${displayName}`}
        className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 px-2 py-1.5 transition hover:bg-slate-50 sm:px-3 [&::-webkit-details-marker]:hidden"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b3d91] text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium text-slate-700 sm:inline">
          <span className="block truncate">{displayName}</span>
          {company?.name ? (
            <span className="block max-w-40 truncate text-left text-[10px] font-normal text-slate-500">
              {company.name}
            </span>
          ) : null}
        </span>
        <ChevronDown aria-hidden="true" size={14} className="text-slate-500" />
      </summary>

      <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
        <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
        {user.email ? <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p> : null}
        {company?.name ? <p className="mt-1 truncate text-xs text-slate-500">{company.name}</p> : null}
        <div className="my-3 border-t border-slate-100" />
        <Link
          href="/profile"
          className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View profile
        </Link>
        {signOutError ? (
          <p role="alert" className="mb-3 text-xs text-rose-700">
            {signOutError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </details>
  );
}
