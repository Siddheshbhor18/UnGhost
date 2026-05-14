import { NextResponse } from "next/server";
import { getAI } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawText: string = body.rawText ?? "";
  if (!rawText.trim()) {
    return NextResponse.json(
      { error: "rawText required" },
      { status: 400 },
    );
  }
  const parsed = await getAI().parseResume(rawText);
  return NextResponse.json(parsed);
}
