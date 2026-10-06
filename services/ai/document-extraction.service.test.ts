import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock supabaseAdmin before importing the service under test.
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

// pdf-parse v2 depends on pdfjs-dist which requires --experimental-vm-modules in Jest.
// We mock it here so unit tests focus on the service logic (DB updates, error paths).
// Real PDF parsing is exercised in integration/e2e tests.
jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn<() => Promise<{ text: string }>>().mockResolvedValue({
      text: "SafetyXP unit test extracted text sufficient for validation purposes.",
    }),
  })),
}));

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  extractAndPersistDocumentText,
  extractTextFromDocument,
  validateDocumentExtraction,
  SUPPORTED_MIME_TYPES,
} from "./document-analysis.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockDbChain(overrides: Record<string, unknown> = {}) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ...overrides,
  };
  return chain;
}

function makeStorageMock(
  downloadResult: { data: unknown; error: unknown },
  removeResult = { error: null }
) {
  return {
    download: jest.fn<() => Promise<{ data: unknown; error: unknown }>>().mockResolvedValue(downloadResult),
    remove: jest.fn<() => Promise<{ error: unknown }>>().mockResolvedValue(removeResult),
  };
}



// Minimal valid DOCX as a Buffer (created via JSZip-compatible structure).
// Mammoth requires a proper Open XML zip. We create the smallest valid one.
async function minimalDocxBuffer(): Promise<Buffer> {
  const JSZip = (await import("jszip" as string)).default ?? (await import("jszip" as string));
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.folder("_rels")!.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`
  );
  zip.folder("word")!.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>SafetyXP extraction test document with sufficient content for validation.</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );
  const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Tests: SUPPORTED_MIME_TYPES
// ---------------------------------------------------------------------------

describe("SUPPORTED_MIME_TYPES", () => {
  it("includes PDF", () => {
    expect(SUPPORTED_MIME_TYPES.has("application/pdf")).toBe(true);
  });

  it("includes DOCX", () => {
    expect(
      SUPPORTED_MIME_TYPES.has(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe(true);
  });

  it("excludes unsupported types", () => {
    expect(SUPPORTED_MIME_TYPES.has("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe(false);
    expect(SUPPORTED_MIME_TYPES.has("text/plain")).toBe(false);
    expect(SUPPORTED_MIME_TYPES.has("image/png")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: validateDocumentExtraction
// ---------------------------------------------------------------------------

describe("validateDocumentExtraction", () => {
  it("returns true for sufficiently long text", () => {
    expect(validateDocumentExtraction("This is a valid document with enough content.")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(validateDocumentExtraction("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(validateDocumentExtraction("   ")).toBe(false);
  });

  it("returns false for text shorter than 20 chars", () => {
    expect(validateDocumentExtraction("too short")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: extractTextFromDocument (legacy in-memory path)
// ---------------------------------------------------------------------------

describe("extractTextFromDocument (inline content)", () => {
  it("resolves with inline content when file has content field", async () => {
    const text = await extractTextFromDocument({
      name: "policy.pdf",
      type: "application/pdf",
      content: "This is the inline document content used in tests.",
    });
    expect(text).toBe("This is the inline document content used in tests.");
  });

  it("rejects for unsupported MIME type when no inline content is provided", async () => {
    // Pass an object that looks like a File (has name+type but no content field)
    // so the MIME-type guard runs instead of the inline-content early-return.
    const filelike = { name: "file.pptx", type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" } as Parameters<typeof extractTextFromDocument>[0];
    await expect(extractTextFromDocument(filelike)).rejects.toThrow("Unsupported document type.");
  });
});

// ---------------------------------------------------------------------------
// Tests: extractAndPersistDocumentText
// ---------------------------------------------------------------------------

describe("extractAndPersistDocumentText — PDF", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("extracts text from a PDF and updates the DB (pdf-parse mocked)", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4 placeholder");
    const mockChain = makeMockDbChain();
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue(
      makeStorageMock({
        data: new Blob([pdfBuffer]),
        error: null,
      })
    );

    const result = await extractAndPersistDocumentText({
      policyDocumentId: "doc-pdf-001",
      storagePath: "company-a/policy-a/policy.pdf",
      fileType: "application/pdf",
    });

    expect(result.text.length).toBeGreaterThan(0);
    // Should have called update twice: once for 'extracting', once for 'ready'
    expect(mockChain.update).toHaveBeenCalledTimes(2);
    const secondCall = (mockChain.update as jest.Mock).mock.calls[1][0] as Record<string, unknown>;
    expect(secondCall.processing_status).toBe("ready");
    expect(secondCall.extracted_text).toBeDefined();
  });

  it("marks processing_status=failed when pdf-parse throws (corrupt/empty PDF)", async () => {
    // Override the module-level mock to simulate a parse failure for this test only.
    const { PDFParse } = await import("pdf-parse");
    (PDFParse as unknown as jest.Mock).mockImplementationOnce(() => ({
      getText: jest.fn<() => Promise<never>>().mockRejectedValue(new Error("Invalid PDF structure.")),
    }));

    const mockChain = makeMockDbChain();
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue(
      makeStorageMock({
        data: new Blob([Buffer.from("not a real pdf")]),
        error: null,
      })
    );

    await expect(
      extractAndPersistDocumentText({
        policyDocumentId: "doc-bad-001",
        storagePath: "company-a/policy-a/corrupt.pdf",
        fileType: "application/pdf",
      })
    ).rejects.toThrow();

    const lastUpdateCall = (mockChain.update as jest.Mock).mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastUpdateCall?.processing_status).toBe("failed");
  });
});

describe("extractAndPersistDocumentText — DOCX", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("extracts text from a valid DOCX and updates the DB", async () => {
    const docxBuffer = await minimalDocxBuffer();
    const mockChain = makeMockDbChain();
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue(
      makeStorageMock({ data: new Blob([new Uint8Array(docxBuffer)]), error: null })
    );

    const result = await extractAndPersistDocumentText({
      policyDocumentId: "doc-docx-001",
      storagePath: "company-a/policy-a/policy.docx",
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(result.text).toContain("SafetyXP extraction test document");
    const secondCall = (mockChain.update as jest.Mock).mock.calls[1][0] as Record<string, unknown>;
    expect(secondCall.processing_status).toBe("ready");
  });

  it("marks processing_status=failed when DOCX is invalid", async () => {
    const mockChain = makeMockDbChain();
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue(
      makeStorageMock({ data: new Blob([Buffer.from("not a docx")]), error: null })
    );

    await expect(
      extractAndPersistDocumentText({
        policyDocumentId: "doc-bad-docx-001",
        storagePath: "company-a/policy-a/bad.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      })
    ).rejects.toThrow();

    const lastCall = (mockChain.update as jest.Mock).mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.processing_status).toBe("failed");
  });
});

describe("extractAndPersistDocumentText — unsupported type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects and marks failed for unsupported MIME type", async () => {
    const mockChain = makeMockDbChain();
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue(
      makeStorageMock({ data: new Blob([Buffer.from("pptx content")]), error: null })
    );

    await expect(
      extractAndPersistDocumentText({
        policyDocumentId: "doc-pptx-001",
        storagePath: "company-a/policy-a/deck.pptx",
        fileType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      })
    ).rejects.toThrow("Unsupported file type");

    const lastCall = (mockChain.update as jest.Mock).mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.processing_status).toBe("failed");
  });
});

describe("extractAndPersistDocumentText — storage failure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects and marks failed when storage download fails", async () => {
    const mockChain = makeMockDbChain();
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);
    (supabaseAdmin.storage.from as jest.Mock).mockReturnValue(
      makeStorageMock({ data: null, error: new Error("Object not found") })
    );

    await expect(
      extractAndPersistDocumentText({
        policyDocumentId: "doc-dl-fail-001",
        storagePath: "company-a/policy-a/missing.pdf",
        fileType: "application/pdf",
      })
    ).rejects.toThrow("Failed to download document from storage.");

    const lastCall = (mockChain.update as jest.Mock).mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.processing_status).toBe("failed");
  });
});
