import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getLiveSessionById,
  recordLiveAttendance,
} from "@/server/store";
import { issueAuthToken, videoMode } from "@/server/integrations/video";
import { requireSameOrigin } from "@/server/lib/csrf";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST → issue a 100ms join token for the authenticated user.
 *
 * Only callable for sessions that are currently "live". Instructor gets
 * host role, students get guest role. Attendance is recorded in the
 * session document for the post-mortem analytics roll-up.
 */
export async function POST(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const live = await getLiveSessionById(params.id);
  if (!live) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (live.status !== "live") {
    return NextResponse.json({ error: "not_active" }, { status: 409 });
  }
  if (!live.videoRoomId) {
    return NextResponse.json(
      { error: "room_not_provisioned" },
      { status: 503 },
    );
  }

  const isInstructor = live.instructorId === session.user.id;
  const role: "host" | "guest" = isInstructor ? "host" : "guest";

  if (!isInstructor) {
    await recordLiveAttendance(params.id, session.user.id);
  }

  const auth = issueAuthToken({
    roomId: live.videoRoomId,
    userId: session.user.id,
    role,
  });

  return NextResponse.json({ ...auth, mode: videoMode() });
}
