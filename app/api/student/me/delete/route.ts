import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { softDeleteUser } from "@/server/store";

export const runtime = "nodejs";

/**
 * DPDP delete request. PRD: 30-day soft delete grace, then a cron anonymises
 * PII while preserving the audit/financial trail. Phase 1: mark deletedAt +
 * flip searchVisibility off so the user disappears from new surfaces.
 */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await softDeleteUser(session.user.id);
  return NextResponse.json({
    ok: true,
    deletedAt: new Date().toISOString(),
    graceDays: 30,
  });
}
