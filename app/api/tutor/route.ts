import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";
import { getAI } from "@/server/integrations/ai";
import { getBootcampById } from "@/server/store";

export const runtime = "nodejs";
// AI call can run 10-30s; lift Vercel's function ceiling so a slow model reply
// isn't killed mid-request. Phase 1 (Inngest) moves these off the request path.
export const maxDuration = 60;

// Bounds tuned so a hostile client can't drop a megabyte of history into an
// LLM prompt (paid tokens) or send weird content types.
const Input = z.object({
  bootcampId: z.string().min(1).max(64),
  videoId: z.string().min(1).max(64).optional(),
  timestampSec: z.number().min(0).max(60 * 60 * 24).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["student", "tutor"]),
        content: z.string().max(4000),
      }),
    )
    .max(50)
    .optional(),
});

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // LLM-cost guard — 15 tutor turns / minute / user, matching the AI Coach
  // budget. Without this any logged-in student could fan out unbounded
  // (paid) model calls.
  const rl = await rateLimit("tutor", identifierFromRequest(req, session.user.id), {
    limit: 15,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const bootcamp = await getBootcampById(body.bootcampId);
  if (!bootcamp) {
    return NextResponse.json({ error: "bootcamp not found" }, { status: 404 });
  }
  const video = body.videoId
    ? bootcamp.videos.find((v) => v.id === body.videoId)
    : undefined;
  const reply = await getAI().chatTutor(body.history ?? [], {
    bootcamp,
    video,
    timestampSec: body.timestampSec,
  });
  return NextResponse.json(reply);
}
