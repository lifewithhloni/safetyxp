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
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Date Range</span>
            <select value={filters.dateRange} onChange={(event) => onChange({ dateRange: event.target.value as ReportFilters["dateRange"] })} className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0b3d91]">
              {options.dateRanges.map((dateRange) => (
                <option key={dateRange} value={dateRange}>{dateRange}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Campaign</span>
            <select value={filters.campaign} onChange={(event) => onChange({ campaign: event.target.value })} className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0b3d91]">
              {options.campaigns.map((campaign) => (
                <option key={campaign} value={campaign}>{campaign}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Department</span>
            <select value={filters.department} onChange={(event) => onChange({ department: event.target.value })} className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0b3d91]">
              {options.departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Location</span>
            <select value={filters.location} onChange={(event) => onChange({ location: event.target.value })} className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0b3d91]">
              {options.locations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Manager</span>
            <select value={filters.manager} onChange={(event) => onChange({ manager: event.target.value })} className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0b3d91]">
              {options.managers.map((manager) => (
                <option key={manager} value={manager}>{manager}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Employee</span>
            <select value={filters.employee} onChange={(event) => onChange({ employee: event.target.value })} className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0b3d91]">
              {options.employees.map((employee) => (
                <option key={employee} value={employee}>{employee}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Status</span>
            <select value={filters.status} onChange={(event) => onChange({ status: event.target.value as ReportFilters["status"] })} className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#0b3d91]">
              {options.statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" onClick={onExport} className="inline-flex items-center justify-center rounded-full bg-[#0b3d91] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#083069]">
          Export
        </button>
      </div>
    </div>
  );
}
