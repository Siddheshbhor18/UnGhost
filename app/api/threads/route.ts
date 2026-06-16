import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getOrCreateApplicationThread,
  getOrCreateInMailThread,
  listMessageThreadsForUser,
} from "@/server/store";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";

export const runtime = "nodejs";

const CreateThreadInput = z.object({
  applicationId: z.string().trim().min(1).max(64).optional(),
  inmailId: z.string().trim().min(1).max(64).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });
  return NextResponse.json(await listMessageThreadsForUser(session.user.id));
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = await parseBody(req, CreateThreadInput);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  let thread;
  if (body?.applicationId) {
    thread = await getOrCreateApplicationThread(body.applicationId);
  } else if (body?.inmailId) {
    thread = await getOrCreateInMailThread(body.inmailId);
  } else {
    return NextResponse.json(
      { error: "applicationId or inmailId required" },
      { status: 400 },
    );
  }
  if (!thread) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (
    thread.recruiterId !== session.user.id &&
    thread.studentId !== session.user.id
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(thread);
}
