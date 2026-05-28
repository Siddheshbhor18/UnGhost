import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { markNotificationRead } from "@/server/store";

export const runtime = "nodejs";

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(_req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const n = await markNotificationRead(params.id, session.user.id);
  if (!n) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(n);
}
