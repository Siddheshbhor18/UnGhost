import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getBootcampById,
  updateBootcamp,
} from "@/server/store";
import type { Bootcamp, BootcampStatus } from "@/shared/types";
import { ROOM_IDS } from "@/shared/rooms";

export const runtime = "nodejs";

const CATEGORIES = ROOM_IDS;

const STATUSES: BootcampStatus[] = [
  "draft",
  "in_review",
  "published",
  "changes_requested",
  "archived",
];

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const bc = await getBootcampById(params.id);
  if (!bc || bc.instructorId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(bc);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as Partial<Bootcamp> | null;
  if (!body) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Validate enums
  if (body.category && !CATEGORIES.includes(body.category)) {
    return NextResponse.json(
      { error: "invalid category" },
      { status: 400 },
    );
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  // Bound numerics
  if (body.priceINR !== undefined) {
    body.priceINR = Math.max(0, Math.min(99999, body.priceINR));
  }
  if (body.durationWeeks !== undefined) {
    body.durationWeeks = Math.max(1, Math.min(52, body.durationWeeks));
  }

  const updated = await updateBootcamp(params.id, session.user.id, body);
  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
