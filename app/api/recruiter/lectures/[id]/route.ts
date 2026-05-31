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

/** DELETE — a recruiter removes their own lecture. */
export async function DELETE(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters_only" }, { status: 403 });
  }
  const lecture = await getRoomLectureById(params.id);
  if (!lecture) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (lecture.recruiterId !== session.user.id) {
    return NextResponse.json({ error: "not_yours" }, { status: 403 });
  }
  await deleteRoomLecture(params.id);
  void writeAuditLog({
    actorId: session.user.id,
    actorRole: "recruiter",
    action: "lecture.delete",
    targetType: "lecture",
    targetId: params.id,
    summary: `Lecture removed by owner`,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
