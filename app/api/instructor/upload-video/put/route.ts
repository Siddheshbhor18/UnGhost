import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { mockWrite, storageMode } from "@/server/integrations/storage";

export const runtime = "nodejs";

/**
 * PUT /api/instructor/upload-video/put?key=…
 *
 * Mock-mode only. The /upload-video presign endpoint rewrites the
 * R2 URL to this same-origin handler when storageMode === "mock". The
 * browser PUTs the file bytes here; we land them on disk under .uploads/.
 *
 * Production (R2 mode) never hits this — the browser PUTs straight to R2.
 */
export async function PUT(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  if (storageMode() !== "mock") {
    return NextResponse.json({ error: "not_mock_mode" }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors_only" }, { status: 403 });
  }
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }
  if (!key.startsWith("bootcamp-video/")) {
    return NextResponse.json({ error: "wrong_prefix" }, { status: 400 });
  }
  const buf = new Uint8Array(await req.arrayBuffer());
  await mockWrite(key, buf);
  return NextResponse.json({ ok: true });
}
