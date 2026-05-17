import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getPaymentStatus } from "@/server/integrations/payments";
import {
  getSponsorshipById,
  updateSponsorshipStatus,
  notify,
  recordProcessedTxn,
  writeAuditLog,
  getBootcampById,
} from "@/server/store";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * GET /api/recruiter/sponsorships/callback?orderId=spons_...
 *
 * PhonePe (or mock) bounces here after the recruiter finishes payment.
 * Verifies status, flips the sponsorship from `payment_pending` → `offered`
 * (idempotent via ProcessedTxn), and fires the student notification.
 *
 * Browser then redirects to /recruiter/candidates so the recruiter sees
 * their now-active sponsorship.
 */
async function handler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.redirect(new URL("/recruiter/login", req.url));
  }
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId || !orderId.startsWith("spons_")) {
    return NextResponse.redirect(
      new URL("/recruiter/candidates?sponsorship=bad_order", req.url),
    );
  }

  const sponsorship = await getSponsorshipById(orderId);
  if (!sponsorship) {
    return NextResponse.redirect(
      new URL("/recruiter/candidates?sponsorship=not_found", req.url),
    );
  }
  if (sponsorship.recruiterId !== session.user.id) {
    logger.warn(
      { orderId, sessionUser: session.user.id },
      "sponsorship.callback-mismatch",
    );
    return NextResponse.redirect(
      new URL("/recruiter/candidates?sponsorship=auth_mismatch", req.url),
    );
  }

  // Already-processed? Just redirect.
  if (sponsorship.status !== "payment_pending") {
    return NextResponse.redirect(
      new URL("/recruiter/candidates?sponsorship=ok", req.url),
    );
  }

  const status = await getPaymentStatus(orderId);
  if (!status.ok || status.status !== "success") {
    await updateSponsorshipStatus(orderId, "expired");
    logger.warn({ orderId, status }, "sponsorship.callback-not-success");
    return NextResponse.redirect(
      new URL(
        `/recruiter/candidates?sponsorship=payment_${status.status}`,
        req.url,
      ),
    );
  }

  const txnId =
    (status as { providerTxnId?: string }).providerTxnId ?? orderId;
  const record = await recordProcessedTxn({
    txnId,
    provider: status.channel === "mock" ? "mock" : "phonepe",
    orderId,
    userId: session.user.id,
    plan: "sponsorship",
    amountPaise: sponsorship.pricePaid * 100,
    status: "success",
    via: "callback",
  });

  if (record.firstTime) {
    await updateSponsorshipStatus(orderId, "offered");
    const bootcamp = await getBootcampById(sponsorship.bootcampId);
    await notify({
      userId: sponsorship.studentId,
      kind: "sponsorship_offered",
      priority: "high",
      title: `${sponsorship.companyName} wants to sponsor your bootcamp`,
      body: bootcamp
        ? `${bootcamp.title} — covers your ${bootcamp.skill} gap. 30 days to accept.`
        : `Sponsorship available for 30 days.`,
      link: "/dashboard",
      actorLabel: sponsorship.companyName,
      actionRequired: true,
    });
    await writeAuditLog({
      actorId: session.user.id,
      actorRole: "recruiter",
      action: "sponsorship.payment.completed",
      targetType: "sponsorship",
      targetId: orderId,
      summary: `Paid sponsorship ${orderId} via ${txnId}`,
    });
  }

  return NextResponse.redirect(
    new URL("/recruiter/candidates?sponsorship=ok", req.url),
  );
}

export const GET = withApiErrorTracking(handler);
