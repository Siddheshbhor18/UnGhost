import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  createSessionRecording,
  deleteLiveSession,
  getBootcampById,
  getLiveSessionById,
  getUserById,
  registerForLiveSession,
  setLiveSessionStatus,
  updateExternalLiveSession,
  setLiveSessionStream,
  unregisterFromLiveSession,
  writeAuditLog,
} from "@/server/store";
import type { LiveSessionStatus } from "@/shared/types";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

// `recordingUrl` lands in <a href> and <video src> on the instructor
// recordings page. `z.string().url()` accepts `javascript:` (WHATWG parses
// it) so a hostile instructor could plant a click-XSS payload against any
// admin/instructor viewing the recording. Lock the scheme to http(s).
// External-session fields are stricter still: the join link must be https
// (it lands in a server-side 302), images may be https or a same-origin path.
const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => /^https:\/\//i.test(v), {
    message: "must be an https:// URL",
  });

const PatchInput = z.object({
  action: z.enum([
    "register",
    "unregister",
    "start",
    "end",
    "cancel",
    "setStream",
    "updateExternal",
  ]),
  youtubeVideoId: z.string().trim().min(1).max(200).optional(),
  recordingUrl: z
    .string()
    .trim()
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u), {
      message: "recordingUrl must be http(s)",
    })
    .optional(),
  // updateExternal payload — owner-only edit of an external session.
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(15).max(240).optional(),
  externalJoinUrl: httpsUrl.optional(),
  thumbnailUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (v) => /^https:\/\//i.test(v) || (v.startsWith("/") && !v.startsWith("//")),
      { message: "must be https:// or a same-origin /path" },
    )
    .optional(),
  previewVideoUrl: httpsUrl.optional(),
});

/** GET — fetch one session. */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const live = await getLiveSessionById(params.id);
  if (!live) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(live);
}

/**
 * PATCH — action verbs:
 *   { action: "register" | "unregister" }  → student self-action
 *   { action: "start" | "end" | "cancel" } → instructor only
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;
  const { action } = parsed.data;
  const live = await getLiveSessionById(params.id);
  if (!live) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "register" || action === "unregister") {
    if (session.user.role !== "student") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // Paid live sessions gate registration on bootcamp enrolment. Without
    // this, a free-plan student could register for a paid session (roster
    // += self) and pick up the "you're registered" UI. Previously this
    // wasn't a leak on its own — content stayed gated at playback — but
    // it presented a misleading "you're in" signal AND fed the roster that
    // the playback-token route was using before it was hardened.
    if (action === "register" && live.tier === "paid" && live.bootcampId) {
      const user = await getUserById(session.user.id);
      const enrolled = user?.profile?.enrolledBootcamps ?? [];
      if (!enrolled.includes(live.bootcampId)) {
        return NextResponse.json(
          {
            error: "not_enrolled",
            message:
              "You need to be enrolled in this bootcamp to register for this session.",
          },
          { status: 403 },
        );
      }
    }
    if (action === "register") {
      await registerForLiveSession(params.id, session.user.id);
    } else {
      await unregisterFromLiveSession(params.id, session.user.id);
    }
    return NextResponse.json({ ok: true });
  }

  // Instructor-only verbs
  if (live.instructorId !== session.user.id) {
    return NextResponse.json({ error: "not_owner" }, { status: 403 });
  }

  if (action === "setStream") {
    if (!parsed.data.youtubeVideoId) {
      return NextResponse.json(
        { error: "youtubeVideoId required" },
        { status: 400 },
      );
    }
    const resolved = await setLiveSessionStream(
      params.id,
      session.user.id,
      parsed.data.youtubeVideoId,
    );
    if (!resolved) {
      return NextResponse.json(
        { error: "invalid_youtube_id_or_url" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, youtubeVideoId: resolved });
  }

  if (action === "updateExternal") {
    if ((live.sessionType ?? "unghost") !== "external") {
      return NextResponse.json(
        { error: "not_external_session" },
        { status: 400 },
      );
    }
    const { title, description, startsAt, durationMin } = parsed.data;
    const ok = await updateExternalLiveSession(params.id, session.user.id, {
      title,
      description,
      startsAt,
      durationMin,
      externalJoinUrl: parsed.data.externalJoinUrl,
      thumbnailUrl: parsed.data.thumbnailUrl,
      previewVideoUrl: parsed.data.previewVideoUrl,
    });
    if (!ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    // Attribution trail — link rotation is a security-relevant event.
    // Only the meeting HOST goes in the summary, never the secret URL.
    const changed = Object.entries({
      title,
      description,
      startsAt,
      durationMin,
      externalJoinUrl: parsed.data.externalJoinUrl,
      thumbnailUrl: parsed.data.thumbnailUrl,
      previewVideoUrl: parsed.data.previewVideoUrl,
    })
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    void writeAuditLog({
      actorId: session.user.id,
      actorRole: "instructor",
      action: "live_session.external_update",
      targetType: "live_session",
      targetId: params.id,
      summary: parsed.data.externalJoinUrl
        ? `External session updated (${changed.join(", ")}); link rotated to ${hostOf(parsed.data.externalJoinUrl) ?? "unknown host"}`
        : `External session updated (${changed.join(", ")})`,
    });
    // Never echo externalJoinUrl back — the response stays link-free.
    return NextResponse.json({ ok: true });
  }

  const statusMap: Record<string, LiveSessionStatus> = {
    start: "live",
    end: "ended",
    cancel: "cancelled",
  };
  // On end, auto-fill recordingUrl from youtubeVideoId if not provided.
  const endExtra =
    action === "end"
      ? {
          recordingUrl:
            parsed.data.recordingUrl ??
            (live.youtubeVideoId
              ? `https://www.youtube.com/watch?v=${live.youtubeVideoId}`
              : undefined),
        }
      : undefined;
  await setLiveSessionStatus(
    params.id,
    session.user.id,
    statusMap[action],
    endExtra,
  );

  // On end, if the session is tied to a bootcamp and has a recording URL,
  // create the SessionRecording row so it lands in the instructor's
  // Keep/Delete review queue (idempotent on sessionId).
  if (action === "end" && endExtra?.recordingUrl && live.bootcampId) {
    const bc = await getBootcampById(live.bootcampId);
    await createSessionRecording({
      sessionId: params.id,
      bootcampId: live.bootcampId,
      instructorId: session.user.id,
      sessionTitle: live.title ?? "Live session",
      bootcampTitle: bc?.title,
      playbackUrl: endExtra.recordingUrl,
      provider: endExtra.recordingUrl.includes("youtube") ? "youtube" : "mock",
    });
  }

  return NextResponse.json({ ok: true, status: statusMap[action] });
}

/** DELETE — instructor removes a scheduled session. */
export async function DELETE(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await deleteLiveSession(params.id, session.user.id);
  return NextResponse.json({ ok: true });
}

/** Meeting host for audit summaries — never the full (secret) URL. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
