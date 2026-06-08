import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";
import { effectivePlan, planAllowsCoach } from "@/server/lib/quota";
import { getAI } from "@/server/integrations/ai";
import {
  appendCoachMessage,
  createCoachConversation,
  deleteCoachConversation,
  getCoachConversation,
  getUserById,
  listBootcamps,
  listCoachConversations,
  rollupCoachMemory,
  setCoachPersona,
} from "@/server/store";
import { buildCoachContext } from "@/server/lib/coach-context";
import { roomLabel } from "@/shared/rooms";
import { COACH_PERSONAS, type CoachPersona } from "@/shared/types";

const PersonaSchema = z.enum(["balanced", "encouraging", "direct", "strategic"]);
const PostInput = z.object({
  conversationId: z.string().min(1).max(64).optional(),
  persona: PersonaSchema.optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(50),
});
const PatchInput = z.object({ persona: PersonaSchema });

export const runtime = "nodejs";

/** GET — list conversations, or fetch one with ?id=convo_xxx. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const convo = await getCoachConversation(id, session.user.id);
    if (!convo) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(convo);
  }
  const list = await listCoachConversations(session.user.id);
  return NextResponse.json({ conversations: list });
}

/** POST — send a chat turn. Persists into a conversation. */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // Subscription gate — Free plan cannot use the coach.
  const userForGate = await getUserById(session.user.id);
  if (userForGate && !planAllowsCoach(userForGate)) {
    return NextResponse.json(
      {
        error: "upgrade_required",
        plan: effectivePlan(userForGate),
        message: "AI Coach is included with the Premium plan.",
        upgradeUrl: "/upgrade",
      },
      { status: 402 },
    );
  }
  // 15 chat turns / minute / user — matches PRD free-tier budget.
  const rl = await rateLimit("coach", identifierFromRequest(req, session.user.id), {
    limit: 15,
    windowSec: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = await parseBody(req, PostInput);
  if (!parsed.ok) return parsed.response;
  const {
    history,
    conversationId: conversationIdIn,
    persona: personaOverride,
  } = parsed.data;

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "no_user_turn" }, { status: 400 });
  }

  const user = await getUserById(session.user.id);
  const persona: CoachPersona =
    personaOverride ?? user?.coachPersona ?? "balanced";
  const personaDef =
    COACH_PERSONAS.find((p) => p.id === persona) ?? COACH_PERSONAS[0];

  // Ensure persistence: create if no conversationId, otherwise append.
  let convoId = conversationIdIn;
  if (!convoId) {
    const created = await createCoachConversation(
      session.user.id,
      lastUser.content,
    );
    convoId = created.id;
  } else {
    await appendCoachMessage(
      convoId,
      session.user.id,
      "student",
      lastUser.content,
    );
  }

  // Map history to AI adapter shape (student/coach) and prepend persona note + memory hint.
  const coachHistory: Array<{ role: "student" | "coach"; content: string }> = [];
  if (user?.aiCoachMemory?.summary) {
    coachHistory.push({
      role: "coach",
      content: `[memory] ${user.aiCoachMemory.summary}`,
    });
  }
  coachHistory.push({
    role: "coach",
    content: `[persona:${personaDef.id}] ${personaDef.systemNote}`,
  });

  // Ground the model in the REAL catalog. Without this, an 8B model invents
  // plausible-but-fake course names ("Data Analysis with Python" etc.) when
  // asked for recommendations. We list only published bootcamps and forbid
  // inventing anything outside this list.
  const allBootcamps = await listBootcamps();
  const liveCatalog = allBootcamps.filter(
    (b) => (b.status ?? "published") === "published",
  );
  const catalogLine =
    liveCatalog.length > 0
      ? liveCatalog
          .map((b) => `"${b.title}" (${roomLabel(b.category)} room)`)
          .join("; ")
      : "(none published yet)";
  coachHistory.push({
    role: "coach",
    content:
      `[catalog] The ONLY bootcamps that exist on unGhost right now: ${catalogLine}. ` +
      `[rules] When recommending courses or bootcamps you MUST only name ones from this exact catalog. ` +
      `Never invent, assume, or mention any course/bootcamp not in the list. ` +
      `If nothing in the catalog fits the student, say we don't have one yet rather than making one up.`,
  });
  // Ground the model in THIS student's real situation (pipeline, SLA status,
  // recent assessment outcomes, top matched open missions) so advice is
  // specific instead of generic. DB-only; same pattern as the catalog block.
  const studentContext = await buildCoachContext(session.user.id);
  if (studentContext) {
    coachHistory.push({
      role: "coach",
      content:
        `[student] Live, factual context about THIS student — use it to ` +
        `personalize and reference their real applications, gaps, and matched ` +
        `missions; never contradict it or invent details beyond it: ${studentContext}`,
    });
  }

  for (const m of history) {
    coachHistory.push({
      role: m.role === "assistant" ? "coach" : "student",
      content: m.content,
    });
  }

  const reply = await getAI().chatCoach(coachHistory, user?.profile);
  const replyText =
    typeof reply === "string"
      ? reply
      : reply?.message ?? "Got it. Let me think more.";

  await appendCoachMessage(convoId, session.user.id, "coach", replyText);

  // Roll up memory in background (await is fine here — fast in-Mongo op).
  await rollupCoachMemory(
    session.user.id,
    coachHistory.filter((m) => !m.content.startsWith("[")),
  );

  return NextResponse.json({
    conversationId: convoId,
    persona: personaDef.id,
    message: replyText,
    suggestions: typeof reply === "object" ? reply?.suggestions ?? [] : [],
  });
}

/** PATCH — update persona. */
export async function PATCH(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;
  await setCoachPersona(session.user.id, parsed.data.persona);
  return NextResponse.json({ ok: true, persona: parsed.data.persona });
}

/** DELETE — remove a conversation with ?id=convo_xxx. */
export async function DELETE(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  await deleteCoachConversation(id, session.user.id);
  return NextResponse.json({ ok: true });
}
