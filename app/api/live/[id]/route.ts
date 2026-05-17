import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  deleteLiveSession,
  getLiveSessionById,
  registerForLiveSession,
  setLiveSessionStatus,
  unregisterFromLiveSession,
} from "@/server/store";
import type { LiveSessionStatus } from "@/shared/types";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

const PatchInput = z.object({
  action: z.enum(["register", "unregister", "start", "end", "cancel"]),
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
  const statusMap: Record<string, LiveSessionStatus> = {
    start: "live",
    end: "ended",
    cancel: "cancelled",
  };
  await setLiveSessionStatus(params.id, session.user.id, statusMap[action]);
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
