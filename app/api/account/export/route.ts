import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { exportUserData } from "@/server/auth/dpdp";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  identifierFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/server/lib/rate-limit";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * DPDP § 11 — data portability.
 *
 * GET → JSON dump of every artefact we hold for the authenticated user.
 * The response includes Content-Disposition so the browser triggers a
 * download of `unghost-data-<userId>-<date>.json`.
 *
 * Rate-limited to 3 exports / hour / user.
 */
export async function GET(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const rl = await rateLimit("dpdp-export", identifierFromRequest(req, session.user.id), {
    limit: 3,
    windowSec: 60 * 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const data = await exportUserData(session.user.id);
  logger.info({ userId: session.user.id }, "dpdp.export-issued");

  const filename = `unghost-data-${session.user.id}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
