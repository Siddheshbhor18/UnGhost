import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { runSlaSweep } from "@/server/store";

export const runtime = "nodejs";

/**
 * SLA breach sweep. Scans active applications, flips expired SLAs to
 * "rejected · breached", refunds the application credit, fires notifications
 * to both student and recruiter, and fires T-12h / T-4h warnings.
 *
 * Two trigger modes:
 *   1. Scheduled (Vercel Cron / external scheduler):
 *        Header `Authorization: Bearer ${CRON_SECRET}` required.
 *        Configure in vercel.json `crons` (every 5 min recommended).
 *   2. Manual admin trigger:
 *        Authenticated admin session — used by the Admin Today button.
 */
async function isAuthorised(req: Request): Promise<boolean> {
  // Allow Vercel cron via secret bearer
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return true;
  }
  // Otherwise require admin session
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

export async function POST(req: Request) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await runSlaSweep();
  return NextResponse.json({ ok: true, ...result });
}

// Also accept GET for easy admin manual trigger from the browser.
export async function GET(req: Request) {
  return POST(req);
}
