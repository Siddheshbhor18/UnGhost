import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { getCreatorById } from "@/server/creator/creator.service";
import { getUserById } from "@/server/store";
import { issueResetToken } from "@/server/auth/reset-token";
import { sendEmail } from "@/server/integrations/email";
import { logCreatorEvent } from "@/server/creator/event.service";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/admin/creators/[id]/invite
 *
 * Admin-only. Mints a single-use set-password token (reused reset-token
 * machinery) and emails the creator a link to /creatordashboard/activate.
 * The creator's `invitedAt` is already stamped at profile creation, so this
 * route only (re-)issues the token + notification.
 */
async function handler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }

  const creator = await getCreatorById(params.id);
  if (!creator) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // The creator's email lives on the backing User row (creatorId === User._id).
  const creatorUser = await getUserById(params.id);
  if (!creatorUser) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { token, rateLimited } = await issueResetToken(
    creatorUser.id,
    creatorUser.email,
  );
  if (rateLimited) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/creatordashboard/activate?token=${token}`;
  // Fire-and-forget — don't block the admin response on Resend latency
  // (500-1500ms). A send failure is logged, not surfaced (mirror signup).
  void sendEmail({
    to: creatorUser.email,
    subject: "Set up your unGhost creator account",
    text: `You've been invited to the unGhost creator program. Set your password to activate your account: ${url}\n\nThis link expires in 1 hour.`,
    html: `
      <div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px">
        <h2>Welcome to the unGhost creator program</h2>
        <p>Set your password to activate your creator account and access your dashboard.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0191FC;color:#fff;border-radius:12px;text-decoration:none;font-weight:600">Set password</a></p>
        <p style="color:#666;font-size:13px">Or copy this link: ${url}</p>
        <p style="color:#999;font-size:11px">This link expires in 1 hour.</p>
      </div>`,
  }).catch((err) => {
    logger.warn({ err, creatorId: params.id }, "creator.invite-email-failed");
  });

  await logCreatorEvent({
    entityType: "creator",
    entityId: params.id,
    actorType: "admin",
    actorId: session.user.id,
    eventType: "creator.invited",
  });

  return NextResponse.json({ ok: true });
}

export const POST = withRateLimit(
  { bucket: "admin.creator-invite", limit: 60, windowSec: 3600, by: "user" },
  withApiErrorTracking(handler),
);
