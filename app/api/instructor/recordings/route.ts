import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { listRecordingsByInstructor } from "@/server/store";
import { withApiErrorTracking } from "@/server/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/instructor/recordings
 *
 * Returns every recording owned by the authenticated instructor that isn't
 * deleted. Used by /instructor/recordings to populate the list of clips
 * awaiting review + already-kept clips.
 */
async function handler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors only" }, { status: 403 });
  }
  const recordings = await listRecordingsByInstructor(session.user.id);
  return NextResponse.json({ recordings });
}

export const GET = withApiErrorTracking(handler);
