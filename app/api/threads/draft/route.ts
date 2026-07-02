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
import {
  getMessageThreadById,
  getUserById,
  listMessagesInThread,
} from "@/server/store";

export const runtime = "nodejs";
// AI call can run 10-30s; lift Vercel's function ceiling so a slow model reply
// isn't killed mid-request. Phase 1 (Inngest) moves these off the request path.
export const maxDuration = 60;

// Bound the intent hint so the AI-drafting prompt can't be padded with
// megabytes of user-supplied text.
const Input = z.object({
  threadId: z.string().min(1).max(64),
  intent: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // LLM-cost guard — drafting fires a model call; cap per-user bursts so a
  // logged-in client can't fan out unbounded (paid) model calls.
  const rl = await rateLimit(
    "ai.draft",
    identifierFromRequest(req, session.user.id),
    { limit: 20, windowSec: 60 },
  );
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const t = await getMessageThreadById(body.threadId);
  if (!t || (t.recruiterId !== session.user.id && t.studentId !== session.user.id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const senderRole: "student" | "recruiter" =
    t.recruiterId === session.user.id ? "recruiter" : "student";
  const other = await getUserById(
    senderRole === "recruiter" ? t.studentId : t.recruiterId,
  );
  const messages = await listMessagesInThread(body.threadId);
  const recent = messages
    .slice(-6)
    .map((m) => ({ role: m.senderRole, body: m.body }));

  const drafted = await getAI().draftMessage({
    senderRole,
    recipientName: other?.name,
    jobTitle: t.jobTitle,
    companyName: t.companyName,
    recentMessages: recent,
    intent: body.intent,
  });
  return NextResponse.json({ draft: drafted });
}
