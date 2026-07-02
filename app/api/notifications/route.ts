import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/server/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ items: [], unread: 0 }, { status: 200 });
  }
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  // Clamp limit to a sane range so a hostile ?limit=10000000 can't pin the
  // event loop loading every historical notification into memory. NaN
  // (limit=abc) falls back to the default.
  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(1, Math.trunc(rawLimit)), 200)
    : 50;
  const [items, unread] = await Promise.all([
    listNotifications(session.user.id, { unreadOnly, limit }),
    countUnreadNotifications(session.user.id),
  ]);
  return NextResponse.json({ items, unread });
}
