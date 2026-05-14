import { NextResponse } from "next/server";
import { getAI } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { jdText } = await req.json().catch(() => ({ jdText: "" }));
  if (!jdText?.trim()) {
    return NextResponse.json({ error: "jdText required" }, { status: 400 });
  }
  const parsed = await getAI().parseJD(jdText);
  return NextResponse.json(parsed);
}
