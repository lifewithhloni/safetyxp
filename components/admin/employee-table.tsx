"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Download, Plus, Upload, ChevronRight } from "lucide-react";
import { mockEmployees } from "@/services/employee-management";
import type { EmployeeFiltersState, EmployeeRecord } from "@/types/employee-management";
import { ComplianceBadge } from "@/components/admin/compliance-badge";
import { ProgressBar } from "@/components/admin/progress-bar";
import { EmployeeProfilePanel } from "@/components/admin/employee-profile-panel";

export function EmployeeTable() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<EmployeeFiltersState>({
    department: "All",
    location: "All",
    manager: "All",
    campaign: "All",
    complianceStatus: "All",
  });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);

  const filteredEmployees = useMemo(() => {
    return mockEmployees.filter((employee) => {
      const matchesQuery = [employee.name, employee.employeeNumber, employee.department, employee.manager].some((value) => value.toLowerCase().includes(query.toLowerCase()));
      const matchesDepartment = filters.department === "All" || employee.department === filters.department;
      const matchesLocation = filters.location === "All" || employee.location === filters.location;
      const matchesManager = filters.manager === "All" || employee.manager === filters.manager;
      const matchesCampaign = filters.campaign === "All" || employee.campaign === filters.campaign;
      const matchesStatus = filters.complianceStatus === "All" || employee.status === filters.complianceStatus;
      return matchesQuery && matchesDepartment && matchesLocation && matchesManager && matchesCampaign && matchesStatus;
    });
  }, [filters, query]);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employees" className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0b3d91]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <Upload className="h-4 w-4" />
              Import Employees
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-full bg-[#0b3d91] px-3 py-2 text-sm font-semibold text-white">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="All">Department</option>
            <option value="Operations">Operations</option>
            <option value="Engineering">Engineering</option>
            <option value="Warehouse">Warehouse</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            <option value="Construction">Construction</option>
          </select>
          <select value={filters.location} onChange={(event) => setFilters((current) => ({ ...current, location: event.target.value }))} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="All">Location</option>
            <option value="Johannesburg">Johannesburg</option>
            <option value="Cape Town">Cape Town</option>
            <option value="Durban">Durban</option>
            <option value="Pretoria">Pretoria</option>
            <option value="Gqeberha">Gqeberha</option>
          </select>
          <select value={filters.manager} onChange={(event) => setFilters((current) => ({ ...current, manager: event.target.value }))} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="All">Manager</option>
            <option value="Nadia Brooks">Nadia Brooks</option>
            <option value="Rafael Gomez">Rafael Gomez</option>
            <option value="Darren Cole">Darren Cole</option>
            <option value="Mina Lewis">Mina Lewis</option>
            <option value="Tendai Moyo">Tendai Moyo</option>
          </select>
          <select value={filters.campaign} onChange={(event) => setFilters((current) => ({ ...current, campaign: event.target.value }))} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="All">Campaign</option>
            <option value="Fire Safety Refresh">Fire Safety Refresh</option>
            <option value="Equipment Safety">Equipment Safety</option>
            <option value="Warehouse Safety">Warehouse Safety</option>
            <option value="Site Safety">Site Safety</option>
            <option value="Policy Awareness">Policy Awareness</option>
          </select>
          <select value={filters.complianceStatus} onChange={(event) => setFilters((current) => ({ ...current, complianceStatus: event.target.value }))} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <option value="All">Compliance Status</option>
            <option value="Compliant">Compliant</option>
            <option value="In Progress">In Progress</option>
            <option value="Overdue">Overdue</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left"><input type="checkbox" className="rounded border-slate-300" /></th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Employee Number</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Department</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Manager</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Current Campaign</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Progress</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Compliance Score</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Last Activity</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(employee.id)} onChange={() => toggleSelection(employee.id)} className="rounded border-slate-300" /></td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelectedEmployee(employee)} className="flex items-center gap-3 text-left">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b3d91] text-sm font-semibold text-white">{employee.name.split(" ").map((item) => item[0]).join("").slice(0, 2)}</div>
                      <div>
                        <p className="font-semibold text-slate-900">{employee.name}</p>
                        <p className="text-xs text-slate-500">{employee.location}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{employee.employeeNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.department}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.manager}</td>
                  <td className="px-4 py-3 text-slate-600">{employee.campaign}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <ProgressBar percent={employee.progress} />
                      <p className="text-xs text-slate-500">{employee.lessonsCompleted} of {employee.totalLessons} lessons</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{employee.complianceScore}%</td>
                  <td className="px-4 py-3"><ComplianceBadge status={employee.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{employee.lastActivity}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">View <ChevronRight className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">{filteredEmployees.length} employees matching your filters</p>
        <div className="flex gap-2">
          <button type="button" className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Assign Campaign</button>
          <button type="button" className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Send Reminder</button>
          <button type="button" className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">Export</button>
        </div>
      </div>

      <AnimatePresence>
        {selectedEmployee ? <EmployeeProfilePanel employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
