"use client";

import type { ReportFilters } from "@/types/reports";

type ReportFilterOptions = {
  dateRanges: string[];
  campaigns: string[];
  departments: string[];
  locations: string[];
  managers: string[];
  employees: string[];
  statuses: string[];
};

type ReportFiltersProps = {
  filters: ReportFilters;
  options: ReportFilterOptions;
  onChange: (value: Partial<ReportFilters>) => void;
  onExport: () => void;
};

export function ReportFilters({ filters, options, onChange, onExport }: ReportFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500">Date Range</span>
            <select value={filters.dateRange} onChange={(event) => onChange({ dateRange: event.target.value as ReportFilters["dateRange"] })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20">
              {options.dateRanges.map((dateRange) => (
                <option key={dateRange} value={dateRange}>{dateRange}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500">Campaign</span>
            <select value={filters.campaign} onChange={(event) => onChange({ campaign: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20">
              {options.campaigns.map((campaign) => (
                <option key={campaign} value={campaign}>{campaign}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500">Department</span>
            <select value={filters.department} onChange={(event) => onChange({ department: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20">
              {options.departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500">Location</span>
            <select value={filters.location} onChange={(event) => onChange({ location: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20">
              {options.locations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500">Manager</span>
            <select value={filters.manager} onChange={(event) => onChange({ manager: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20">
              {options.managers.map((manager) => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500">Employee</span>
            <select value={filters.employee} onChange={(event) => onChange({ employee: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20">
              {options.employees.map((employee) => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-500">Status</span>
            <select value={filters.status} onChange={(event) => onChange({ status: event.target.value as ReportFilters["status"] })} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#90c822] focus:ring-2 focus:ring-[#9bdc28]/20">
              {options.statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={onExport} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#9bdc28] px-5 py-3 text-sm font-semibold text-[#102a43] transition hover:bg-[#b6eb6f]">
          Export
        </button>
      </div>
    </div>
  );
}
