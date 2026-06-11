import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { createPayment, paymentsMode } from "@/server/integrations/payments";
import { getUserById, countPremiumUsers } from "@/server/store";
import { isActiveUser } from "@/server/auth/account-status";
import { effectivePlan } from "@/server/lib/quota";
import { computeTotalPaise } from "@/server/payments/pricing";
import {
  PLAN_PRICING,
  PREMIUM_GST_PERCENT,
  PREMIUM_LIFETIME_SEATS,
} from "@/shared/types";

export const runtime = "nodejs";

const Input = z.object({
  plan: z.enum(["premium"]),
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * POST { plan: "premium" } → create a PhonePe order.
 *
 * Returns { redirectUrl } the browser navigates to. After success/failure
 * the user is bounced back to /api/billing/callback (handled by the
 * existing PhonePe webhook contract).
 *
 * In mock mode, redirectUrl auto-resolves to a success URL so dev flows
 * complete without any external dependency.
 */
async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isActiveUser(user)) {
    return NextResponse.json({ error: "account_inactive" }, { status: 403 });
  }

  // Launch offer: ₹4,999 lifetime is capped at the first N premium buyers.
  // Skip the cap for users who already hold premium (no-op re-purchase).
  if (effectivePlan(user) !== "premium") {
    const premiumCount = await countPremiumUsers();
    if (premiumCount >= PREMIUM_LIFETIME_SEATS) {
      return NextResponse.json(
        {
          error: "offer_closed",
          reason: `The lifetime offer is sold out (limited to the first ${PREMIUM_LIFETIME_SEATS} members).`,
        },
        { status: 409 },
      );
    }
  }

  const pricing = PLAN_PRICING[parsed.data.plan];
  // Price is exclusive of tax; add GST on top and charge the total.
  const { totalInPaise } = computeTotalPaise({
    priceInPaise: pricing.amountINR * 100,
    gstPercent: PREMIUM_GST_PERCENT,
  });
  // Order id = `bill_<plan>_<userId>_<ts>` so the callback knows which plan to activate.
  const orderId = `bill_${parsed.data.plan}_${user.id}_${Date.now()}`;
  const redirectUrl = `${APP_URL}/api/billing/callback?orderId=${orderId}`;

  const result = await createPayment({
    orderId,
    amountPaise: totalInPaise,
    description: `unGhost ${pricing.label} plan`,
    redirectUrl,
    payerPhone: user.profile?.contactPhone,
  });

  if (!result.ok || !result.redirectUrl) {
    return NextResponse.json(
      { error: "payment_init_failed", reason: result.error },
      { status: 502 },
    );
  }
  return NextResponse.json({
    redirectUrl: result.redirectUrl,
    orderId,
    providerTxnId: result.providerTxnId,
    mode: paymentsMode(),
  });
}

// 10 checkouts / 5 min / user — catches accidental double-click loops and
// scripted abuse without hurting a real student who hits "Pay" twice.
export const POST = withRateLimit(
  { bucket: "billing.checkout", limit: 10, windowSec: 300, by: "user" },
  withApiErrorTracking(postHandler),
);
