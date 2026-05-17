import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  deleteSavedSearch,
  updateSavedSearchFrequency,
} from "@/server/store";
import type { SavedSearch } from "@/shared/types";

export const runtime = "nodejs";

const FREQS: SavedSearch["alertFrequency"][] = [
  "off",
  "instant",
  "daily",
  "weekly",
];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as {
    alertFrequency: SavedSearch["alertFrequency"];
  } | null;
  if (!body?.alertFrequency || !FREQS.includes(body.alertFrequency)) {
    return NextResponse.json(
      { error: "invalid alertFrequency" },
      { status: 400 },
    );
  }
  await updateSavedSearchFrequency(
    params.id,
    session.user.id,
    body.alertFrequency,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  await deleteSavedSearch(params.id, session.user.id);
  return NextResponse.json({ ok: true });
}
