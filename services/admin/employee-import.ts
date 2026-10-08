export type EmployeeCsvData = {
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string | null;
  jobTitle: string | null;
  department: string | null;
};

export type EmployeeCsvRow = {
  rowNumber: number;
  employee: EmployeeCsvData;
  errors: string[];
  status: "ready" | "skipped" | "error" | "created";
};

export type EmployeeCsvPreview = {
  rows: EmployeeCsvRow[];
  ready: number;
  skipped: number;
  errors: number;
};

const requiredHeaders = ["first name", "last name", "email"] as const;
const optionalHeaders = ["employee number", "job title", "department"] as const;
const validHeaders = new Set<string>([...requiredHeaders, ...optionalHeaders]);

function parseCsvRecords(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const rows: Array<{ fields: string[]; rowNumber: number }> = [];
  let fields: string[] = [];
  let field = "";
  let line = 1;
  let rowStart = 1;
  let inQuotes = false;
  let afterQuote = false;

  const pushField = () => {
    fields.push(field.trim());
    field = "";
    afterQuote = false;
  };
  const pushRow = () => {
    pushField();
    if (fields.some((value) => value.length > 0)) {
      rows.push({ fields, rowNumber: rowStart });
    }
    fields = [];
    rowStart = line + 1;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
        afterQuote = true;
      } else {
        field += character;
        if (character === "\n") {
          line += 1;
        }
      }
      continue;
    }

    if (afterQuote && /\s/.test(character) && character !== "\r" && character !== "\n") {
      continue;
    }

    if (character === ",") {
      pushField();
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && source[index + 1] === "\n") {
        index += 1;
      }
      pushRow();
      line += 1;
      rowStart = line;
    } else if (character === '"') {
      if (field.trim().length > 0) {
        throw new Error(`Unexpected quote on row ${line}.`);
      }
      field = "";
      inQuotes = true;
    } else if (afterQuote) {
      throw new Error(`Unexpected content after a quoted field on row ${line}.`);
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error(`Unclosed quoted field starting on row ${rowStart}.`);
  }

  if (field.length > 0 || fields.length > 0 || afterQuote) {
    pushRow();
  }

  return rows;
}

function normalizedHeader(header: string) {
  return header.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function previewEmployeeCsv(
  csvText: string,
  context: {
    departments: Array<{ id: string; name: string }>;
    existingEmails: string[];
    existingEmployeeNumbers: string[];
  }
): EmployeeCsvPreview {
  const records = parseCsvRecords(csvText);
  const headerRecord = records[0];
  if (!headerRecord) {
    throw new Error("The CSV file is empty.");
  }

  const headers = headerRecord.fields.map(normalizedHeader);
  const headerSet = new Set(headers);
  const missingHeaders = requiredHeaders.filter((header) => !headerSet.has(header));
  const unknownHeaders = headers.filter((header) => !validHeaders.has(header));
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);

  if (missingHeaders.length > 0 || unknownHeaders.length > 0 || duplicateHeaders.length > 0) {
    const problems = [
      missingHeaders.length ? `Missing required columns: ${missingHeaders.join(", ")}.` : "",
      unknownHeaders.length ? `Unsupported columns: ${[...new Set(unknownHeaders)].join(", ")}.` : "",
      duplicateHeaders.length ? `Duplicate columns: ${[...new Set(duplicateHeaders)].join(", ")}.` : "",
    ].filter(Boolean);
    throw new Error(problems.join(" "));
  }

  const columnIndexes = new Map(headers.map((header, index) => [header, index]));
  const readValue = (record: string[], header: string) => {
    const index = columnIndexes.get(header);
    return index === undefined ? "" : record[index] ?? "";
  };

  const rows = records.slice(1).map(({ fields, rowNumber }): EmployeeCsvRow => {
    const employee: EmployeeCsvData = {
      firstName: readValue(fields, "first name"),
      lastName: readValue(fields, "last name"),
      email: readValue(fields, "email").toLocaleLowerCase(),
      employeeNumber: readValue(fields, "employee number") || null,
      jobTitle: readValue(fields, "job title") || null,
      department: readValue(fields, "department") || null,
    };
    const errors: string[] = [];

    if (!employee.firstName) errors.push("First name is required.");
    if (!employee.lastName) errors.push("Last name is required.");
    if (!employee.email || !isValidEmail(employee.email)) errors.push("Enter a valid email address.");
    if (employee.firstName.length > 100) errors.push("First name must be 100 characters or fewer.");
    if (employee.lastName.length > 100) errors.push("Last name must be 100 characters or fewer.");
    if (employee.email.length > 320) errors.push("Email must be 320 characters or fewer.");
    if (employee.employeeNumber && employee.employeeNumber.length > 100) {
      errors.push("Employee number must be 100 characters or fewer.");
    }
    if (employee.jobTitle && employee.jobTitle.length > 150) {
      errors.push("Job title must be 150 characters or fewer.");
    }

    if (employee.department && !context.departments.some(
      (department) => department.name.toLocaleLowerCase() === employee.department?.toLocaleLowerCase()
    )) {
      errors.push(`Department "${employee.department}" is not available for this company.`);
    }

    return { rowNumber, employee, errors, status: errors.length ? "error" : "ready" };
  });

  const emailRows = new Map<string, EmployeeCsvRow[]>();
  const employeeNumberRows = new Map<string, EmployeeCsvRow[]>();
  rows.forEach((row) => {
    if (row.employee.email) {
      const matchingRows = emailRows.get(row.employee.email) ?? [];
      matchingRows.push(row);
      emailRows.set(row.employee.email, matchingRows);
    }
    if (row.employee.employeeNumber) {
      const employeeNumber = row.employee.employeeNumber.toLocaleLowerCase();
      const matchingRows = employeeNumberRows.get(employeeNumber) ?? [];
      matchingRows.push(row);
      employeeNumberRows.set(employeeNumber, matchingRows);
    }
  });

  emailRows.forEach((matchingRows, email) => {
    if (matchingRows.length > 1) {
      matchingRows.forEach((row) => row.errors.push(`Email "${email}" appears more than once in this CSV.`));
    }
  });
  employeeNumberRows.forEach((matchingRows, employeeNumber) => {
    if (matchingRows.length > 1) {
      matchingRows.forEach((row) => row.errors.push(`Employee number "${employeeNumber}" appears more than once in this CSV.`));
    }
  });

  const existingEmails = new Set(context.existingEmails.map((email) => email.trim().toLocaleLowerCase()));
  const existingNumbers = new Set(context.existingEmployeeNumbers.map((number) => number.trim().toLocaleLowerCase()));

  rows.forEach((row) => {
    if (row.errors.length > 0) {
      row.status = "error";
      return;
    }
    if (existingEmails.has(row.employee.email)) {
      row.status = "skipped";
      row.errors.push("An employee with this email already exists in your company.");
      return;
    }
    if (row.employee.employeeNumber && existingNumbers.has(row.employee.employeeNumber.toLocaleLowerCase())) {
      row.status = "error";
      row.errors.push("This employee number is already used in your company.");
    }
  });

  return {
    rows,
    ready: rows.filter((row) => row.status === "ready").length,
    skipped: rows.filter((row) => row.status === "skipped").length,
    errors: rows.filter((row) => row.status === "error").length,
  };
}
