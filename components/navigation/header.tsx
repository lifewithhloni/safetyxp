"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Menu, Search, ShieldCheck, X } from "lucide-react";
import { AvatarMenu } from "@/components/navigation/avatar-menu";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { getLessonContent } from "@/services/policy.service";

const lessonContent = getLessonContent();

const searchDestinations = [
  {
    label: "Home",
    detail: "Your safety mission and employee dashboard",
    href: "/today",
    terms: "home mission dashboard today",
  },
  {
    label: "My Learning",
    detail: lessonContent.title,
    href: "/lesson",
    terms: `learning lesson ${lessonContent.title} ${lessonContent.summary} ${lessonContent.policy} ${lessonContent.objective}`,
  },
  {
    label: "Knowledge Checks",
    detail: "Continue to the available knowledge check",
    href: "/quick-check",
    terms: "knowledge check quiz question",
  },
  {
    label: "Certificates",
    detail: "View your compliance record",
    href: "/certificates",
    terms: "certificate certificates compliance",
  },
];

export function Header({
  title,
  description,
  onMenuClick,
}: {
  title: string;
  description: string;
  onMenuClick: () => void;
}) {
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return searchDestinations.filter((item) =>
      `${item.label} ${item.detail} ${item.terms}`.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  function renderSearchResults() {
    if (!isSearchOpen || !query.trim()) {
      return null;
    }

    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        {results.length ? (
          results.map((result) => (
            <Link
              key={result.href}
              href={result.href}
              onClick={() => {
                setIsSearchOpen(false);
                setQuery("");
              }}
              className="block rounded-lg px-3 py-2.5 transition hover:bg-slate-50"
            >
              <span className="block text-sm font-semibold text-slate-800">{result.label}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{result.detail}</span>
            </Link>
          ))
        ) : (
          <p className="px-3 py-3 text-xs leading-5 text-slate-500">
            No matching learning page or topic. Safety Q&amp;A is not available yet.
          </p>
        )}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMenuClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
          >
            <Menu size={19} />
          </button>
          <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[#102a43] text-[#9bdc28] sm:flex lg:hidden">
            <ShieldCheck size={19} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight text-slate-900">{title}</p>
            <p className="hidden truncate text-xs text-slate-500 sm:block">{description}</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
          <div className="relative hidden w-full max-w-md md:block">
            <label htmlFor="employee-search" className="sr-only">
              Search lessons, topics, or ask a safety question
            </label>
            <Search
              aria-hidden="true"
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="employee-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
              placeholder="Search lessons, topics, or ask a safety question..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#90c822] focus:bg-white focus:ring-2 focus:ring-[#9bdc28]/20"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            ) : null}
            {renderSearchResults()}
          </div>
          <NotificationBell />
          <AvatarMenu />
        </div>
      </div>

      <div className="relative mt-3 md:hidden">
        <label htmlFor="employee-search-mobile" className="sr-only">
          Search lessons, topics, or ask a safety question
        </label>
        <Search
          aria-hidden="true"
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          id="employee-search-mobile"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
          placeholder="Search lessons, topics, or ask a safety question..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#90c822] focus:bg-white focus:ring-2 focus:ring-[#9bdc28]/20"
        />
        {renderSearchResults()}
      </div>
    </header>
  );
}
