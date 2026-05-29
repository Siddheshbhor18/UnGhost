import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { presignUpload, storageMode } from "@/server/integrations/storage";
import {
  identifierFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/server/lib/rate-limit";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/vnd.apple.mpegurl",
]);

const Input = z.object({
  contentType: z.string().min(3).max(80),
  filename: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(1).max(500 * 1024 * 1024), // 500 MB cap
});

/**
 * POST /api/instructor/upload-video
 *
 * Mints a presigned PUT URL the browser can upload to directly. Avoids
 * proxying multi-hundred-MB videos through Vercel (4.5 MB serverless cap).
 *
 *   In: { contentType, filename, sizeBytes }
 *   Out: { uploadUrl, publicUrl, headers, mode }
 *
 *   • R2 mode  → uploadUrl is an R2 signed PUT URL. Bucket CORS must allow
 *                PUT from the app origin.
 *   • mock mode → uploadUrl points to /api/instructor/upload-video/put,
 *                which writes to .uploads/ on disk.
 *
 * Instructors only. Rate-limited 12/hour/user (one per ~5 min worst case).
 */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors_only" }, { status: 403 });
  }

  const rl = await rateLimit(
    "instructor-upload",
    identifierFromRequest(req, session.user.id),
    { limit: 12, windowSec: 60 * 60 },
  );
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  if (!ALLOWED_TYPES.has(parsed.data.contentType)) {
    return NextResponse.json(
      { error: "unsupported_type", got: parsed.data.contentType },
      { status: 400 },
    );
  }

  const presigned = await presignUpload({
    prefix: "bootcamp-video",
    contentType: parsed.data.contentType,
    filename: parsed.data.filename,
  });

  // Mock mode — rewrite uploadUrl to a same-origin PUT handler the browser
  // can actually reach. Production R2 URL is already a real HTTPS endpoint.
  const mode = storageMode();
  const uploadUrl =
    mode === "mock"
      ? `/api/instructor/upload-video/put?key=${encodeURIComponent(presigned.key)}`
      : presigned.uploadUrl;

  // Mock mode's publicUrl is a `mock://` scheme that doesn't render in <video>.
  // Rewrite to a same-origin GET handler so dev users can actually watch the
  // uploaded clip back.
  const publicUrl =
    mode === "mock"
      ? `/api/instructor/upload-video/get?key=${encodeURIComponent(presigned.key)}`
      : presigned.publicUrl;

  return NextResponse.json({
    uploadUrl,
    publicUrl,
    headers: presigned.headers,
    mode,
    expiresInSec: presigned.expiresInSec,
  });
}
