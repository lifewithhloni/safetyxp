import { describe, expect, it } from "@jest/globals";
import { previewEmployeeCsv } from "./employee-import";

const departments = [
  { id: "department-1", name: "Operations, West" },
  { id: "department-2", name: "Engineering" },
];

const noExistingEmployees = {
  departments,
  existingEmails: [],
  existingEmployeeNumbers: [],
};

describe("employee CSV import preview", () => {
  it("parses quoted fields, embedded commas, escaped quotes, and surrounding whitespace", () => {
    const preview = previewEmployeeCsv(
      ' First Name ,Last Name,Email,Employee Number,Job Title,Department\r\n"Ari, ""AJ""", Jones ,ari@example.test,A-1,"Safety, Lead","Operations, West"\r\n',
      noExistingEmployees
    );

    expect(preview).toMatchObject({ ready: 1, skipped: 0, errors: 0 });
    expect(preview.rows[0]).toMatchObject({
      rowNumber: 2,
      employee: {
        firstName: 'Ari, "AJ"',
        lastName: "Jones",
        email: "ari@example.test",
        jobTitle: "Safety, Lead",
        department: "Operations, West",
      },
      status: "ready",
    });
  });

  it("rejects missing required headers and malformed quotes", () => {
    expect(() => previewEmployeeCsv(
      "First Name,Email\nAri,ari@example.test",
      noExistingEmployees
    )).toThrow("Missing required columns: last name.");

    expect(() => previewEmployeeCsv(
      'First Name,Last Name,Email\n"Ari,Jones,ari@example.test',
      noExistingEmployees
    )).toThrow("Unclosed quoted field");
  });

  it("reports required fields and invalid email addresses by row", () => {
    const preview = previewEmployeeCsv(
      "First Name,Last Name,Email\nAri,,ari-at-example\n,Smith,sam@example.test",
      noExistingEmployees
    );

    expect(preview.errors).toBe(2);
    expect(preview.rows[0].errors).toEqual(expect.arrayContaining([
      "Last name is required.",
      "Enter a valid email address.",
    ]));
    expect(preview.rows[1].errors).toContain("First name is required.");
  });

  it("marks every duplicate CSV email and employee number as an error", () => {
    const preview = previewEmployeeCsv(
      "First Name,Last Name,Email,Employee Number\nAri,Jones,ari@example.test,A-1\nSam,Brown,ARI@example.test,a-1",
      noExistingEmployees
    );

    expect(preview.ready).toBe(0);
    expect(preview.errors).toBe(2);
    expect(preview.rows[0].errors).toEqual(expect.arrayContaining([
      expect.stringContaining("appears more than once"),
    ]));
    expect(preview.rows[1].errors).toEqual(expect.arrayContaining([
      expect.stringContaining("appears more than once"),
    ]));
  });

  it("skips existing company employees and rejects unknown departments", () => {
    const preview = previewEmployeeCsv(
      "First Name,Last Name,Email,Department\nAri,Jones,ari@example.test,Engineering\nSam,Brown,sam@example.test,Other",
      {
        ...noExistingEmployees,
        existingEmails: ["ARI@example.test"],
      }
    );

    expect(preview).toMatchObject({ ready: 0, skipped: 1, errors: 1 });
    expect(preview.rows[0].status).toBe("skipped");
    expect(preview.rows[1].errors).toContain('Department "Other" is not available for this company.');
  });

  it("returns honest counts for a mixed valid and invalid import preview", () => {
    const preview = previewEmployeeCsv(
      "First Name,Last Name,Email,Department\nAri,Jones,ari@example.test,Engineering\nSam,,bad-email,Unknown\nLee,Green,lee@example.test,",
      {
        ...noExistingEmployees,
        existingEmails: ["lee@example.test"],
      }
    );

    expect(preview).toMatchObject({ ready: 1, skipped: 1, errors: 1 });
    expect(preview.rows.map((row) => row.status)).toEqual(["ready", "error", "skipped"]);
  });
});
