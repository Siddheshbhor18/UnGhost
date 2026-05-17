import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { markThreadRead, getMessageThreadById } from "@/server/store";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const t = await getMessageThreadById(params.id);
  if (!t || (t.recruiterId !== session.user.id && t.studentId !== session.user.id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await markThreadRead(params.id, session.user.id);
  return NextResponse.json({ ok: true });
}
