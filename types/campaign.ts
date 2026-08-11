export type CampaignStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface UploadedDocument {
  name: string;
  size: string;
  pages: number;
  readingTime: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  employees: number;
}

export interface CsvEmployeeRow {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  manager: string;
  location: string;
}

export interface WizardContentItem {
  id: string;
  title: string;
  description: string;
  type: "lesson" | "quiz" | "scenario" | "flashcard";
}

export interface CampaignDraft {
  uploadedDocument: UploadedDocument | null;
  selectedMethod: "company" | "departments" | "csv";
  selectedDepartments: string[];
  importedEmployees: CsvEmployeeRow[];
  deadline: string;
  planner: {
    estimatedLearning: string;
    availableDays: number;
    dailyLearning: string;
  };
  content: WizardContentItem[];
}
