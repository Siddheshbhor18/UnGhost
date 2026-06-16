import { NextResponse } from "next/server";
import { mockRead, storageMode } from "@/server/integrations/storage";

export const runtime = "nodejs";

/**
 * GET /api/company/logo/file?key=…
 *
 * Mock-mode only. Streams back a previously uploaded company logo so an
 * <img>/next-image can display it during dev. Production serves logos directly
 * from R2's public base URL (the stored logoUrl is the CDN URL).
 */
export async function GET(req: Request) {
  if (storageMode() !== "mock") {
    return NextResponse.json({ error: "not_mock_mode" }, { status: 400 });
  }
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key.includes("..") || !key.startsWith("logos/")) {
    return NextResponse.json({ error: "bad_key" }, { status: 400 });
  }
  const buf = await mockRead(key);
  if (!buf) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const lower = key.toLowerCase();
  const ct = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".webp")
      ? "image/webp"
      : lower.endsWith(".svg")
        ? "image/svg+xml"
        : "image/jpeg";
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": ct,
      "cache-control": "private, max-age=300",
      // Defense-in-depth for any pre-existing SVG logos: stop the browser from
      // sniffing/executing scripts if a stored asset is loaded as a document.
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
