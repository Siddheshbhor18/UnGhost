import { NextResponse } from "next/server";
import { mockRead, storageMode } from "@/server/integrations/storage";

export const runtime = "nodejs";

/**
 * GET /api/recruiter/upload-video/get?key=…
 *
 * Mock-mode only. Streams back a previously uploaded lecture video so
 * <video src> can play it during dev. Production serves these directly from
 * R2's public base URL.
 */
export async function GET(req: Request) {
  if (storageMode() !== "mock") {
    return NextResponse.json({ error: "not_mock_mode" }, { status: 400 });
  }
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key.includes("..") || !key.startsWith("lecture-video/")) {
    return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }
  const buf = await mockRead(key);
  if (!buf) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const lower = key.toLowerCase();
  const ct = lower.endsWith(".webm")
    ? "video/webm"
    : lower.endsWith(".mov")
      ? "video/quicktime"
      : lower.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp4";
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": ct,
      "cache-control": "private, max-age=300",
    },
  });
}
