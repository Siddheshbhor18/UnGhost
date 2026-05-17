import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { sendOtp, normalisePhone } from "@/server/integrations/sms";
import { getUserById } from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({
  userId: z.string().min(1).max(64),
});

/**
 * POST /api/auth/resend-otp { userId }
 *
 * Re-issues an OTP for the user's profile.contactPhone. We require the
 * userId (rather than free-form phone) so an attacker can't trigger SMS
 * spam to arbitrary numbers.
 *
 * Two layers of rate-limit:
 *   - This endpoint: 5 / IP / 10 min
 *   - sendOtp() under the hood: phone-level throttling in Redis
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const user = await getUserById(parsed.data.userId);
  if (!user) {
    // Opaque 200 to prevent userId enumeration.
    return NextResponse.json({ ok: true });
  }
  const phone = user.profile?.contactPhone;
  if (!phone) {
    return NextResponse.json({ ok: true });
  }

  const result = await sendOtp(normalisePhone(phone));
  return NextResponse.json({
    ok: result.ok,
    // Mock-mode helper for dev banners. Never set in production.
    demoOtp: result.demoOtp,
  });
}

export const POST = withRateLimit(
  { bucket: "auth.resend-otp", limit: 5, windowSec: 600, by: "ip" },
  withApiErrorTracking(handler),
);
