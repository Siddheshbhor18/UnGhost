import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseQuery } from "@/server/lib/validate";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { listAllPayouts } from "@/server/creator/payout.service";

export const runtime = "nodejs";

/**
 * GET /api/admin/payouts?status= → the payouts queue, newest first. Admin-only.
 */
const ListQuery = z.object({
  status: z
    .enum(["requested", "approved", "processing", "paid", "rejected"])
    .optional(),
});

async function getHandler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = parseQuery(req, ListQuery);
  if (!parsed.ok) return parsed.response;
  const payouts = await listAllPayouts(parsed.data.status);
  return NextResponse.json({ payouts });
}

export const GET = withApiErrorTracking(getHandler);
