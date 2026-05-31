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
 * POST /api/recruiter/upload-video
 *
 * Mints a presigned PUT URL for a recruiter guest-lecture video. Mirrors the
 * instructor upload pipeline but uses the `lecture-video` prefix and a
 * recruiter role gate. Avoids proxying large videos through Vercel.
 *
 * Recruiters only. Rate-limited 12/hour/user.
 */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters_only" }, { status: 403 });
  }

  const rl = await rateLimit(
    "recruiter-upload",
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
    prefix: "lecture-video",
    contentType: parsed.data.contentType,
    filename: parsed.data.filename,
  });

  const mode = storageMode();
  const uploadUrl =
    mode === "mock"
      ? `/api/recruiter/upload-video/put?key=${encodeURIComponent(presigned.key)}`
      : presigned.uploadUrl;
  const publicUrl =
    mode === "mock"
      ? `/api/recruiter/upload-video/get?key=${encodeURIComponent(presigned.key)}`
      : presigned.publicUrl;

  return NextResponse.json({
    uploadUrl,
    publicUrl,
    headers: presigned.headers,
    mode,
    expiresInSec: presigned.expiresInSec,
  });
}
