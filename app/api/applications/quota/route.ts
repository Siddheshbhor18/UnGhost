import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { checkApplyQuota } from "@/server/lib/quota";

export const runtime = "nodejs";

/**
 * GET /api/applications/quota — the student's current apply quota.
 *
 * Lets client surfaces (e.g. the assessment page) gate BEFORE a student
 * sinks effort into an assessment they can't submit. The actual apply POST
 * still enforces the cap server-side (402); this is the read-side mirror.
 *
 * Fails OPEN (allowed) for non-students / missing user so we never wrongly
 * block — the POST remains the source of truth.
 */
export async function GET() {
  const unlimited = {
    allowed: true,
    remaining: -1,
    cap: -1,
    windowKind: "unlimited" as const,
  };
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json(unlimited);
  }
  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json(unlimited);
  return NextResponse.json(await checkApplyQuota(user));
}
