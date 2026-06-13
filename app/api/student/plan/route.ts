/**
 * GET /api/student/plan → { premium: boolean }
 *
 * Live plan signal for client chrome (the navbar "Go Premium" button hides
 * itself for premium users). Read from the DB, not the JWT — premium is
 * activated by admin approval after the session is minted, so the token can
 * be stale. Non-students / signed-out callers get { premium: false }.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { effectivePlan } from "@/server/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ premium: false });
  }
  const user = await getUserById(session.user.id);
  return NextResponse.json({
    premium: !!user && effectivePlan(user) === "premium",
  });
}
