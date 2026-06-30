/**
 * GET /api/student/plan → { plan, paid, premium }
 *
 * Live plan signal for client chrome (the navbar "Go Premium" CTA hides
 * itself for any paying student — jobs plans count, not just legacy
 * premium). Read from the DB, not the JWT, since the plan can flip after
 * the session is minted (admin grant, fresh purchase, sweep demotion).
 * Non-students / signed-out callers get `{ plan: "free", paid: false,
 * premium: false }`.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { effectivePlan } from "@/server/lib/quota";
import type { SubscriptionPlan } from "@/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_RESPONSE = { plan: "free" as SubscriptionPlan, paid: false, premium: false };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json(FREE_RESPONSE);
  }
  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json(FREE_RESPONSE);
  const plan = effectivePlan(user);
  return NextResponse.json({
    plan,
    // `paid` is the navbar gate — true for every non-free tier so a paying
    // jobs-plan student stops seeing "Go Premium".
    paid: plan !== "free",
    // `premium` kept for back-compat callers; true only for legacy premium.
    premium: plan === "premium",
  });
}
