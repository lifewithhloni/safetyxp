export type CSVRowValidationIssue = {
  rowNumber: number;
  message: string;
  severity: "warning" | "error";
};

export function parseCSVRows(csvText: string) {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return rows.slice(1).map((line, index) => ({
    rowNumber: index + 2,
    values: line.split(",").map((value) => value.trim()),
  }));
}

export function validateCSV(csvText: string, context: { companyId: string; adminUserId: string; allowedDepartments: string[] }) {
  const rows = parseCSVRows(csvText);
  const issues: CSVRowValidationIssue[] = [];
  const totalRows = rows.length;

  rows.forEach((row, index) => {
    const [firstName, lastName, email, employeeNumber, department, jobTitle, managerEmail, location, employmentStatus] = row.values;

    if (!firstName || !lastName) {
      issues.push({ rowNumber: row.rowNumber, message: "Missing required names.", severity: "error" });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push({ rowNumber: row.rowNumber, message: `Invalid email for row ${index + 1}.`, severity: "error" });
    }

    if (!employeeNumber) {
      issues.push({ rowNumber: row.rowNumber, message: "Missing employee number.", severity: "error" });
    }

    if (!department || !context.allowedDepartments.includes(department)) {
      issues.push({ rowNumber: row.rowNumber, message: `Department '${department || "Unknown"}' doesn't exist.`, severity: "error" });
    }

    if (!managerEmail) {
      issues.push({ rowNumber: row.rowNumber, message: "Manager email is required.", severity: "warning" });
    }

    if (!location) {
      issues.push({ rowNumber: row.rowNumber, message: "Location is required.", severity: "warning" });
    }

    if (employmentStatus && !["active", "inactive", "suspended"].includes(employmentStatus.toLowerCase())) {
      issues.push({ rowNumber: row.rowNumber, message: `Unsupported employment status '${employmentStatus}'.`, severity: "error" });
    }

    if (row.values.some((value) => value.includes(";;") || value.includes("\n"))) {
      issues.push({ rowNumber: row.rowNumber, message: "Unsupported characters detected.", severity: "error" });
    }
  });

  const uniqueEmails = new Set<string>();
  rows.forEach((row) => {
    const value = row.values[2];
    if (!value) return;
    if (uniqueEmails.has(value)) {
      issues.push({ rowNumber: row.rowNumber, message: `Duplicate email '${value}'.`, severity: "error" });
    }
    uniqueEmails.add(value);
  });

  return {
    companyId: context.companyId,
    adminUserId: context.adminUserId,
    totalRows,
    validRows: Math.max(0, totalRows - issues.filter((issue) => issue.severity === "error").length),
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    errors: issues,
    hasBlockingErrors: issues.some((issue) => issue.severity === "error"),
  };
}
