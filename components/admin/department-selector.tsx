"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

type Department = {
  id: string;
  name: string;
  employees: number;
};

type DepartmentSelectorProps = {
  departments: Department[];
  selectedDepartments: string[];
  onChange: (next: string[]) => void;
};

export function DepartmentSelector({
  departments,
  selectedDepartments,
  onChange,
}: DepartmentSelectorProps) {
  const [query, setQuery] = useState("");

  const visibleDepartments = useMemo(() => {
    return departments.filter((department) =>
      department.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [departments, query]);

  const toggleDepartment = (departmentId: string) => {
    const next = selectedDepartments.includes(departmentId)
      ? selectedDepartments.filter((id) => id !== departmentId)
      : [...selectedDepartments, departmentId];
    onChange(next);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search departments"
          className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none ring-0 focus:border-[#0b3d91]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleDepartments.map((department) => {
          const selected = selectedDepartments.includes(department.id);
          return (
            <button
              key={department.id}
              type="button"
              onClick={() => toggleDepartment(department.id)}
              className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                selected
                  ? "border-[#0b3d91] bg-[#0b3d91] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {department.name} <span className="opacity-80">({department.employees})</span>
            </button>
          );
        })}
      </div>

      {selectedDepartments.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedDepartments.map((id) => {
            const department = departments.find((item) => item.id === id);
            if (!department) return null;
            return (
              <span key={id} className="inline-flex items-center gap-2 rounded-full bg-[#e9f0ff] px-3 py-1 text-sm text-[#0b3d91]">
                {department.name}
                <button type="button" onClick={() => toggleDepartment(id)} aria-label={`Remove ${department.name}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
