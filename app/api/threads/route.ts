import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getOrCreateApplicationThread,
  getOrCreateInMailThread,
  listMessageThreadsForUser,
} from "@/server/store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });
  return NextResponse.json(await listMessageThreadsForUser(session.user.id));
}

interface CreateBody {
  applicationId?: string;
  inmailId?: string;
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as CreateBody | null;
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
