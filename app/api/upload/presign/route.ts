import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  identifierFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/server/lib/rate-limit";
import { presignUpload, storageMode } from "@/server/integrations/storage";

export const runtime = "nodejs";

const ALLOWED_PREFIXES = ["resumes", "logos", "avatars", "bootcamp-cover"] as const;
// Raster + document formats only. `image/svg+xml` is intentionally excluded:
// SVG can carry <script> and would be a stored-XSS vector the moment it's
// served from any origin the app trusts (same-origin fetch, an R2 CNAME under
// unghost.in, a `srcdoc` embed…). The direct company-logo route made the
// same choice at `app/api/company/logo/route.ts` — this must match it, else
// the presign path silently reopens the hole for logos/avatars/covers.
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const Input = z.object({
  prefix: z.enum(ALLOWED_PREFIXES),
  contentType: z.string().refine((s) => ALLOWED_TYPES.includes(s), {
    message: "unsupported_content_type",
  }),
  filename: z.string().max(255).optional(),
});

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const rl = await rateLimit("upload-presign", identifierFromRequest(req, session.user.id), {
    limit: 20,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const presigned = await presignUpload(parsed.data);
  return NextResponse.json({ ...presigned, mode: storageMode() });
}
