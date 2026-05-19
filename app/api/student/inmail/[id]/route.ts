import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getInMailById,
  getOrCreateInMailThread,
  getUserById,
  notify,
  updateInMailStatus,
} from "@/server/store";

export const runtime = "nodejs";

interface Body {
  action: "accept" | "decline";
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const im = await getInMailById(params.id);
  if (!im || im.studentId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (im.status !== "pending") {
    return NextResponse.json(
      { error: `inmail already ${im.status}` },
      { status: 409 },
    );
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (body?.action !== "accept" && body?.action !== "decline") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const updated = await updateInMailStatus(
    params.id,
    body.action === "accept" ? "accepted" : "declined",
  );

  // On accept, materialise (or fetch) the InMail → MessageThread so the
  // student can be routed straight into chat. Decline does nothing extra.
  let threadId: string | undefined;
  if (body.action === "accept") {
    const thread = await getOrCreateInMailThread(params.id);
    threadId = thread?.id;
  }

  const student = await getUserById(session.user.id);
  await notify({
    userId: im.recruiterId,
    kind: body.action === "accept" ? "inmail_accepted" : "inmail_declined",
    priority: body.action === "accept" ? "high" : "normal",
    title:
      body.action === "accept"
        ? `${student?.name ?? "Candidate"} accepted your InMail`
        : `${student?.name ?? "Candidate"} declined your InMail`,
    body:
      body.action === "accept"
        ? `Open a chat in your inbox.`
        : `Cooldown locked for 90 days.`,
    link: threadId
      ? `/recruiter/messages/${threadId}`
      : "/recruiter/command",
    actorLabel: student?.name,
  });
  return NextResponse.json({ ...updated, threadId });
}
