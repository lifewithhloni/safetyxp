"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AdminShell } from "@/features/admin/admin-shell";
import { AssignmentMethodCard } from "@/components/admin/assignment-method-card";
import { DepartmentSelector } from "@/components/admin/department-selector";
import { CSVUploader } from "@/components/admin/csv-uploader";
import { CSVPreviewTable } from "@/components/admin/csv-preview-table";
import { ImportSummaryCard } from "@/components/admin/import-summary-card";
import { EmployeeTable } from "@/components/admin/employee-table";
import { SelectionSummaryCard } from "@/components/admin/selection-summary-card";
import { ContinueButton } from "@/components/admin/continue-button";

type AssignmentMethod = "company" | "departments" | "csv";

type ImportedEmployee = {
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  department: string;
  jobTitle: string;
  manager: string;
  location: string;
};

const mockDepartments = [
  { id: "operations", name: "Operations", employees: 132 },
  { id: "engineering", name: "Engineering", employees: 94 },
  { id: "warehouse", name: "Warehouse", employees: 58 },
  { id: "hr", name: "HR", employees: 24 },
  { id: "finance", name: "Finance", employees: 36 },
  { id: "construction", name: "Construction", employees: 67 },
  { id: "administration", name: "Administration", employees: 41 },
];

export default function AssignEmployeesPage() {
  const [selectedMethod, setSelectedMethod] = useState<AssignmentMethod>("company");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(["operations", "warehouse"]);
  const [importedEmployees, setImportedEmployees] = useState<ImportedEmployee[]>([]);
  const [importSummary, setImportSummary] = useState<{
    importCount: number;
    departmentCount: number;
    locationCount: number;
    invalidEmailCount: number;
  } | null>(null);

  const selectedCount = useMemo(() => {
    if (selectedMethod === "company") return 248;
    if (selectedMethod === "departments") return selectedDepartments.reduce((total, id) => {
      const department = mockDepartments.find((item) => item.id === id);
      return total + (department?.employees ?? 0);
    }, 0);
    return importedEmployees.length || 248;
  }, [importedEmployees.length, selectedDepartments, selectedMethod]);

  const departments = useMemo(() => {
    return selectedDepartments.length
      ? selectedDepartments.map((id) => mockDepartments.find((item) => item.id === id)?.name ?? id)
      : ["Entire company"];
  }, [selectedDepartments]);

  const completionRate = 96;

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportSummary({ importCount: 0, departmentCount: 0, locationCount: 0, invalidEmailCount: 0 });
      return;
    }

    const csvText = `First Name,Last Name,Email,Employee Number,Department,Job Title,Manager,Location\nJohn,Doe,john@company.com,EMP101,Operations,Operator,Jane Smith,Johannesburg\nAlice,Ngubane,alice@company.com,EMP102,Engineering,Engineer,Alex Green,Cape Town\nMpho,Khumalo,mpho@company.com,EMP103,Warehouse,Supervisor,Sam Fields,Durban\nNandi,Smith,invalid-email,EMP104,Finance,Clerk,Paul Jude,Pretoria`;
    const rows = csvText
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => line.split(","));

    const parsedEmployees = rows.map((row) => ({
      firstName: row[0] ?? "",
      lastName: row[1] ?? "",
      email: row[2] ?? "",
      employeeNumber: row[3] ?? "",
      department: row[4] ?? "",
      jobTitle: row[5] ?? "",
      manager: row[6] ?? "",
      location: row[7] ?? "",
    }));

    const invalidEmailCount = parsedEmployees.filter((employee) => !employee.email.includes("@")) .length;

    setImportedEmployees(parsedEmployees);
    setImportSummary({
      importCount: parsedEmployees.length,
      departmentCount: new Set(parsedEmployees.map((employee) => employee.department)).size,
      locationCount: new Set(parsedEmployees.map((employee) => employee.location)).size,
      invalidEmailCount,
    });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b3d91]">Step 2</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Assign Employees</h1>
            <p className="mt-2 max-w-2xl text-base text-slate-600">Choose who should complete this campaign.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            Focus: Who should complete this campaign?
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.65fr_0.85fr]">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <AssignmentMethodCard
                title="Entire Company"
                description="Assign this campaign to every employee."
                icon="company"
                selected={selectedMethod === "company"}
                onSelect={() => setSelectedMethod("company")}
              />
              <AssignmentMethodCard
                title="Departments"
                description="Assign to one or multiple departments."
                icon="departments"
                selected={selectedMethod === "departments"}
                onSelect={() => setSelectedMethod("departments")}
                badge="Searchable"
              >
                {selectedMethod === "departments" ? (
                  <DepartmentSelector
                    departments={mockDepartments}
                    selectedDepartments={selectedDepartments}
                    onChange={setSelectedDepartments}
                  />
                ) : null}
              </AssignmentMethodCard>
              <AssignmentMethodCard
                title="Import Employee List"
                description="Upload a CSV exported from your HR system."
                icon="csv"
                selected={selectedMethod === "csv"}
                onSelect={() => setSelectedMethod("csv")}
                badge="CSV"
              >
                {selectedMethod === "csv" ? <CSVUploader onFileSelect={handleFileSelect} /> : null}
              </AssignmentMethodCard>
            </div>

            {selectedMethod === "csv" && importSummary ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <ImportSummaryCard
                  importCount={importSummary.importCount}
                  departmentCount={importSummary.departmentCount}
                  locationCount={importSummary.locationCount}
                  invalidEmailCount={importSummary.invalidEmailCount}
                />
                <CSVPreviewTable employees={importedEmployees} />
              </motion.div>
            ) : null}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Employee review</h2>
                  <p className="text-sm text-slate-600">Search, sort, and filter the selected audience before continuing.</p>
                </div>
              </div>
              <EmployeeTable />
            </div>
          </div>

          <div className="space-y-6">
            <SelectionSummaryCard selectedCount={selectedCount} departments={departments} completionRate={completionRate} />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Next step</h3>
              <p className="mt-2 text-sm text-slate-600">Continue to set the deadline and campaign details.</p>
              <div className="mt-5">
                <ContinueButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
