import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  markNotInterested,
  unmarkNotInterested,
} from "@/server/store";
import type { NotInterestedFeedback } from "@/shared/types";

export const runtime = "nodejs";

const VALID_REASONS: NotInterestedFeedback["reason"][] = [
  "wrong_role",
  "wrong_location",
  "wrong_pay",
  "wrong_company",
  "already_applied",
  "not_qualified",
  "other",
];

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    reason?: NotInterestedFeedback["reason"];
  };
  const reason =
    body.reason && VALID_REASONS.includes(body.reason)
      ? body.reason
      : undefined;
  const out = await markNotInterested(session.user.id, params.id, reason);
  return NextResponse.json(out);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  await unmarkNotInterested(session.user.id, params.id);
  return NextResponse.json({ ok: true });
}
