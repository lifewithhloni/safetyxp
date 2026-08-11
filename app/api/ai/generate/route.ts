import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { PolicyDocumentMetadata } from "@/types/ai-content";
import { generateContentPackage } from "@/services/ai/ai-content.service";
import { savePolicyDocument, saveGeneratedContent } from "@/services/ai/ai-content-storage.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const document = body.document as PolicyDocumentMetadata;
    const file = body.file as { name: string; type: string; content: string };

    if (!document || !file) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    savePolicyDocument(document);
    const contentPackage = await generateContentPackage(document, file);
    saveGeneratedContent(contentPackage);

    return NextResponse.json({ success: true, content: contentPackage }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
