"use client";

type CSVPreviewTableProps = {
  employees: Array<{
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
    department: string;
    manager: string;
    location: string;
  }>;
};

export function CSVPreviewTable({ employees }: CSVPreviewTableProps) {
  if (!employees.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
        Preview imported employees
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-white">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Employee</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Department</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {employees.slice(0, 6).map((employee, index) => (
              <tr key={`${employee.email}-${index}`} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {employee.firstName} {employee.lastName}
                  </div>
                  <div className="text-xs text-slate-500">{employee.employeeNumber}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{employee.department}</td>
                <td className="px-4 py-3 text-slate-600">{employee.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
