import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getRoomLectureById,
  deleteRoomLecture,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/** DELETE — admin takedown of any recruiter lecture (hygiene control). */
export async function DELETE(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const lecture = await getRoomLectureById(params.id);
  if (!lecture) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await deleteRoomLecture(params.id);
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "lecture.takedown",
    targetType: "lecture",
    targetId: params.id,
    summary: `Admin took down lecture "${lecture.title}" (${lecture.room})`,
  });
  return NextResponse.json({ ok: true });
}
