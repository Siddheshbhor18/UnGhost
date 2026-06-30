import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createReferralSession } from "@/server/creator/referral.service";
import { REFERRAL_SESSION_TTL_DAYS } from "@/server/creator/types";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IS_PROD = process.env.NODE_ENV === "production";
const REF_COOKIE = "ug_ref";

interface Ctx {
  params: { code: string };
}

/**
 * GET /r/[code] — public creator referral entry.
 *
 * Mints a referral session for an active creator's code, drops an HttpOnly
 * `ug_ref` cookie (30d, Secure, SameSite=Lax), then redirects to the homepage.
 * Unknown / inactive codes redirect home silently (no enumeration signal, no
 * cookie). Optional `?campaign=` is captured for per-campaign analytics.
 */
export async function GET(req: Request, { params }: Ctx) {
  const url = new URL(req.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const home = new URL("/", appUrl);

  const campaign = url.searchParams.get("campaign")?.slice(0, 80) || undefined;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = ip
    ? createHash("sha256").update(ip).digest("hex").slice(0, 32)
    : undefined;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? undefined;

  const res = NextResponse.redirect(home);
  try {
    const session = await createReferralSession({
      code: params.code,
      campaign,
      landingPage: "/",
      ipHash,
      userAgent,
    });
    if (session) {
      res.cookies.set(REF_COOKIE, session.token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "lax",
        maxAge: REFERRAL_SESSION_TTL_DAYS * 86_400,
        path: "/",
      });
    }
  } catch (err) {
    // A referral failure must never break the redirect — the visitor still
    // lands on the homepage, just unattributed.
    logger.warn({ err, code: params.code }, "referral.entry-failed");
  }
  return res;
}
