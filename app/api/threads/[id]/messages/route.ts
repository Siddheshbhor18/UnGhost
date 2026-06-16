import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getMessageThreadById,
  getUserById,
  listMessagesInThread,
  markThreadRead,
  notify,
  sendMessage,
} from "@/server/store";
import type { Role } from "@/shared/types";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";

export const runtime = "nodejs";

const SendInput = z.object({ body: z.string().trim().min(1).max(5000) });

async function authzThreadAccess(threadId: string, userId: string) {
  const t = await getMessageThreadById(threadId);
  if (!t) return null;
  if (t.recruiterId !== userId && t.studentId !== userId) return null;
  return t;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const t = await authzThreadAccess(params.id, session.user.id);
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  let messages = await listMessagesInThread(params.id);
  if (since) {
    const cutoff = new Date(since).getTime();
    messages = messages.filter((m) => new Date(m.createdAt).getTime() > cutoff);
  }
  // Auto-mark-read on GET if caller is one of the participants
  await markThreadRead(params.id, session.user.id);
  return NextResponse.json({ thread: t, messages });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const t = await authzThreadAccess(params.id, session.user.id);
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsed = await parseBody(req, SendInput);
  if (!parsed.ok) return parsed.response;
  const text = parsed.data.body;

  const senderRole: "student" | "recruiter" =
    (session.user.role as Role) === "recruiter" ? "recruiter" : "student";

  const msg = await sendMessage({
    threadId: params.id,
    senderId: session.user.id,
    senderRole,
    body: text,
  });
  if (!msg) return NextResponse.json({ error: "send failed" }, { status: 500 });

  // Notify the other party
  const recipientId =
    senderRole === "recruiter" ? t.studentId : t.recruiterId;
  const sender = await getUserById(session.user.id);
  await notify({
    userId: recipientId,
    kind: "message_received",
    priority: "normal",
    title: `New message from ${sender?.name ?? "someone"}`,
    body: msg.body.slice(0, 120),
    link:
      t.context.type === "application"
        ? senderRole === "recruiter"
          ? `/student/applications/${t.context.applicationId}`
          : `/recruiter/command`
        : senderRole === "recruiter"
        ? `/dashboard`
        : `/recruiter/command`,
    actorLabel: sender?.name,
  });

  return NextResponse.json(msg, { status: 201 });
}
