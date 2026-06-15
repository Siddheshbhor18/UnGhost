import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { getAI } from "@/server/integrations/ai";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";

export const runtime = "nodejs";
// AI call can run 10-30s; lift Vercel's function ceiling so a slow model reply
// isn't killed mid-request. Phase 1 (Inngest) moves these off the request path.
export const maxDuration = 60;

const Input = z.object({
  // 50 KB hard cap — JD text rarely exceeds 10 KB. Anything larger is almost
  // certainly someone probing our AI quota with a payload bomb.
  jdText: z.string().min(20).max(50_000),
});

/**
 * POST /api/parse-jd
 *
 * Recruiter-only AI parse of a free-form job description into our normalised
 * Job shape. Each authed recruiter is capped at 30 parses/minute and 200/day
 * which matches what a real recruiter (deploying 1-5 jobs/session) would use.
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiter_only" }, { status: 403 });
  }

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const result = await getAI().parseJD(parsed.data.jdText);
  return NextResponse.json(result);
}

export const POST = withRateLimit(
  { bucket: "ai.parse-jd", limit: 30, windowSec: 60, by: "user" },
  withApiErrorTracking(handler),
);
