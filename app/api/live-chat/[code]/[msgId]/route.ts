/**
 * DELETE /api/live/[code]/chat/[msgId]
 *
 * Soft-deletes a chat message. Only admins (and the session's instructor)
 * can wield this. The original body stays in the DB with `deletedAt` set so
 * we can audit moderation actions — the LIST endpoint filters them out.
 *
 * Why soft-delete: a hard-delete during a live session could race with the
 * polling read for users mid-fetch, leading to a flicker where the message
 * appears then vanishes. Soft-delete is consistent across polls.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { connectMongo } from "@/server/db/mongo";
import {
  LiveSessionMessageModel,
  LiveSessionModel,
} from "@/server/db/models";
import { logger } from "@/server/lib/logger";

export async function DELETE(
  _req: Request,
  { params }: { params: { code: string; msgId: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const liveSession = await LiveSessionModel.findOne({
    roomCode: params.code,
  })
    .select("_id instructorId")
    .lean();
  if (!liveSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Mod permission: admin OR the instructor of this specific session.
  const isAdmin = session.user.role === "admin";
  const isInstructor = session.user.id === liveSession.instructorId;
  if (!isAdmin && !isInstructor) {
    return NextResponse.json(
      { error: "Only the instructor or an admin can moderate this chat." },
      { status: 403 },
    );
  }

  const result = await LiveSessionMessageModel.updateOne(
    {
      _id: params.msgId,
      sessionId: String(liveSession._id),
      deletedAt: null,
    },
    { $set: { deletedAt: new Date(), deletedBy: session.user.id } },
  );

  if (result.matchedCount === 0) {
    return NextResponse.json(
      { error: "Message not found or already deleted" },
      { status: 404 },
    );
  }

  logger.info(
    {
      msgId: params.msgId,
      sessionId: liveSession._id,
      moderatorId: session.user.id,
    },
    "chat.message_deleted",
  );

  return NextResponse.json({ ok: true });
}
