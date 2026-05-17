import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getAI } from "@/server/integrations/ai";
import { updateStudentProfile } from "@/server/store";
import type { StudentProfile } from "@/shared/types";

export const runtime = "nodejs";

const MAX_FILE_MB = 5;

/**
 * Extract text from an uploaded resume. Supports:
 *   - .pdf via `pdf-parse`
 *   - .docx via `mammoth`
 *   - .txt + plain text JSON payload as-is
 *   - any other → falls back to filename-only (mock AI engine pads it out)
 */
async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (name.endsWith(".pdf")) {
      // dynamic import — keeps cold start lean for non-PDF flows
      const mod = await import("pdf-parse");
      // pdf-parse exports default in v2+
      const pdfParse: (b: Buffer) => Promise<{ text: string }> =
        (mod as any).default ?? mod;
      const { text } = await pdfParse(buffer);
      return text.slice(0, 50_000);
    }
    if (name.endsWith(".docx")) {
      const mod = await import("mammoth");
      const { value } = await mod.extractRawText({ buffer });
      return value.slice(0, 50_000);
    }
    if (name.endsWith(".txt")) {
      return buffer.toString("utf8").slice(0, 50_000);
    }
  } catch (err) {
    console.warn("[parse-resume] extraction failed", err);
  }
  // Fallback — feed the filename so the mock AI engine has something to chew
  return `Resume file: ${file.name}`;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  // ── Mode A: multipart (real file upload) ─────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const persistFlag = form.get("persist");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `file must be under ${MAX_FILE_MB}MB` },
        { status: 413 },
      );
    }
    const rawText = await extractText(file);
    const parsed = await getAI().parseResume(rawText);

    // Persist to authenticated student's profile if asked
    if (persistFlag === "1") {
      const session = await getServerSession(authOptions);
      if (session?.user?.id && session.user.role === "student") {
        const patch: Partial<StudentProfile> = {
          alias: parsed.alias,
          contactEmail: parsed.contactEmail,
          contactPhone: parsed.contactPhone,
          city: parsed.city,
          skills: parsed.skills,
          history: parsed.history.map((h, i) => ({
            id: `h_${Date.now().toString(36)}_${i}`,
            ...h,
          })),
          resumeUrl: `mock://uploaded/${encodeURIComponent(file.name)}`,
        };
        await updateStudentProfile(session.user.id, patch);
      }
    }
    return NextResponse.json({
      parsed,
      fileName: file.name,
      sizeBytes: file.size,
      textLength: rawText.length,
    });
  }

  // ── Mode B: JSON `{ rawText }` (existing behavior) ───────────────
  const body = await req.json().catch(() => ({}));
  const rawText: string = body.rawText ?? "";
  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "rawText required (or upload multipart file)" },
      { status: 400 },
    );
  }
  const parsed = await getAI().parseResume(rawText);
  return NextResponse.json({ parsed });
}
