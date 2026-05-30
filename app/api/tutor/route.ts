import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";
import { getAI } from "@/server/integrations/ai";
import { getBootcampById } from "@/server/store";

export const runtime = "nodejs";

interface TutorRequest {
  bootcampId: string;
  videoId?: string;
  timestampSec?: number;
  history?: Array<{ role: "student" | "tutor"; content: string }>;
}

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
  const body = (await req.json().catch(() => ({}))) as Partial<TutorRequest>;
  if (!body.bootcampId) {
    return NextResponse.json({ error: "bootcampId required" }, { status: 400 });
  }
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
