import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  createLiveSession,
  getBootcampById,
  listLiveSessionsByInstructor,
  listUpcomingLiveForStudent,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

const CreateBase = z.object({
  bootcampId: z.string().min(1).max(64),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  startsAt: z.string().datetime(),
  durationMin: z.number().int().min(15).max(240),
});

// External links land in a server-side 302 (`/api/live/[id]/join`) and the
// thumbnail in an <img src>. `z.string().url()` accepts `javascript:`
// (WHATWG parses it), so lock schemes down: the join link must be https
// (every meeting tool is), images may be https or a same-origin path.
const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https:\/\//i.test(v), {
    message: "must be an https:// URL",
  });

const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https:\/\//i.test(v) || (v.startsWith("/") && !v.startsWith("//")), {
    message: "must be https:// or a same-origin /path",
  });

// Discriminated on `sessionType`; the preprocess step defaults legacy
// payloads (no sessionType) to "unghost" so existing clients keep working.
const CreateInput = z.preprocess(
  (raw) =>
    raw && typeof raw === "object" && !("sessionType" in raw)
      ? { ...(raw as Record<string, unknown>), sessionType: "unghost" }
      : raw,
  z.discriminatedUnion("sessionType", [
    CreateBase.extend({ sessionType: z.literal("unghost") }),
    CreateBase.extend({
      sessionType: z.literal("external"),
      externalJoinUrl: httpsUrl,
      thumbnailUrl: imageUrl.optional(),
      previewVideoUrl: httpsUrl.optional(),
    }),
  ]),
);

/** GET — listing. Instructor sees own. Student sees upcoming for enrolled bootcamps. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (session.user.role === "instructor") {
    const sessions = await listLiveSessionsByInstructor(session.user.id);
    return NextResponse.json({ sessions });
  }
  if (session.user.role === "student") {
    const sessions = await listUpcomingLiveForStudent(session.user.id);
    return NextResponse.json({ sessions });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

/** POST — instructor creates a new live session for their bootcamp. */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseBody(req, CreateInput);
  if (!parsed.ok) return parsed.response;
  const { bootcampId, title, description, startsAt, durationMin } = parsed.data;

  const bootcamp = await getBootcampById(bootcampId);
  if (!bootcamp || bootcamp.instructorId !== session.user.id) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 });
  }
  const created = await createLiveSession({
    bootcampId,
    instructorId: session.user.id,
    title,
    description,
    startsAt,
    durationMin,
    sessionType: parsed.data.sessionType,
    ...(parsed.data.sessionType === "external"
      ? {
          externalJoinUrl: parsed.data.externalJoinUrl,
          thumbnailUrl: parsed.data.thumbnailUrl,
          previewVideoUrl: parsed.data.previewVideoUrl,
        }
      : {}),
  });
  if (parsed.data.sessionType === "external") {
    // Attribution trail for the masked link's lifecycle. Only the meeting
    // HOST is recorded — the full URL is the secret and stays out of logs.
    void writeAuditLog({
      actorId: session.user.id,
      actorRole: "instructor",
      action: "live_session.external_create",
      targetType: "live_session",
      targetId: created.id,
      summary: `External session "${created.title}" created on ${hostOf(parsed.data.externalJoinUrl) ?? "unknown host"} for bootcamp ${bootcampId}`,
    });
  }
  // `created` never carries externalJoinUrl (createLiveSession keeps the
  // secret out of its return) — safe to echo wholesale.
  return NextResponse.json(created, { status: 201 });
}

/** Meeting host for audit summaries — never the full (secret) URL. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
