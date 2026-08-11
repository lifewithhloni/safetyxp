import type { CampaignDraft, CsvEmployeeRow, DepartmentOption, UploadedDocument, WizardContentItem } from "@/types/campaign";

export const mockDepartments: DepartmentOption[] = [
  { id: "operations", name: "Operations", employees: 132 },
  { id: "engineering", name: "Engineering", employees: 94 },
  { id: "warehouse", name: "Warehouse", employees: 58 },
  { id: "hr", name: "HR", employees: 24 },
  { id: "finance", name: "Finance", employees: 36 },
  { id: "construction", name: "Construction", employees: 67 },
  { id: "administration", name: "Administration", employees: 41 },
];

export const mockUploadedDocument: UploadedDocument = {
  name: "Fire Safety Policy.pdf",
  size: "2.4 MB",
  pages: 42,
  readingTime: "18 min",
};

export const mockCsvEmployees: CsvEmployeeRow[] = [
  { employeeNumber: "EMP101", firstName: "John", lastName: "Doe", email: "john@company.com", department: "Operations", manager: "Jane Smith", location: "Johannesburg" },
  { employeeNumber: "EMP102", firstName: "Alice", lastName: "Ngubane", email: "alice@company.com", department: "Engineering", manager: "Alex Green", location: "Cape Town" },
  { employeeNumber: "EMP103", firstName: "Mpho", lastName: "Khumalo", email: "mpho@company.com", department: "Warehouse", manager: "Sam Fields", location: "Durban" },
  { employeeNumber: "EMP104", firstName: "Nandi", lastName: "Smith", email: "invalid-email", department: "Finance", manager: "Paul Jude", location: "Pretoria" },
];

export const mockWizardContent: WizardContentItem[] = [
  { id: "lesson-1", title: "Emergency response basics", description: "A concise lesson on escalation and safe response.", type: "lesson" },
  { id: "quiz-1", title: "Fire drill assessment", description: "A short quiz to reinforce key safety behaviours.", type: "quiz" },
  { id: "scenario-1", title: "Blocked exit scenario", description: "A realistic workplace intervention scenario.", type: "scenario" },
  { id: "flashcard-1", title: "PPE reminders", description: "Quick recall cards for field teams.", type: "flashcard" },
];

export const initialCampaignDraft: CampaignDraft = {
  uploadedDocument: mockUploadedDocument,
  selectedMethod: "company",
  selectedDepartments: ["operations", "warehouse"],
  importedEmployees: mockCsvEmployees,
  deadline: "2026-09-30",
  planner: {
    estimatedLearning: "180 minutes",
    availableDays: 18,
    dailyLearning: "10 minutes",
  },
  content: mockWizardContent,
};
