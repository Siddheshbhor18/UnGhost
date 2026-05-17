import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, parseQuery } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";
import {
  sendOtp,
  verifyOtp,
  getLastMockOtp,
  smsMode,
} from "@/server/integrations/sms";

export const runtime = "nodejs";

const PhoneSchema = z
  .string()
  .min(10)
  .max(20)
  .refine((s) => s.replace(/[^\d]/g, "").length >= 10, "phone_too_short");

const SendSchema = z.object({ phone: PhoneSchema });
const VerifySchema = z.object({
  phone: PhoneSchema,
  code: z.string().length(6).regex(/^\d{6}$/),
});
const QuerySchema = z.object({ phone: PhoneSchema });

/** POST { phone } → send OTP. Returns { ok, mode, demoOtp? }. */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  // 5 OTP requests / 10 min / IP — stops SMS bombing.
  const rl = await rateLimit("otp", identifierFromRequest(req), {
    limit: 5,
    windowSec: 600,
  });
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = await parseBody(req, SendSchema);
  if (!parsed.ok) return parsed.response;
  const res = await sendOtp(parsed.data.phone);
  return NextResponse.json({
    ok: res.ok,
    mode: smsMode(),
    demoOtp: res.demoOtp,
    error: res.error,
  });
}

/** PUT { phone, code } → verify OTP. */
export async function PUT(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const parsed = await parseBody(req, VerifySchema);
  if (!parsed.ok) return parsed.response;
  const res = await verifyOtp(parsed.data.phone, parsed.data.code);
  return NextResponse.json({
    ok: res.ok,
    mode: smsMode(),
    error: res.error,
  });
}

/** GET ?phone=… → fetch last mock OTP for the demo banner. Mock mode only. */
export async function GET(req: Request) {
  if (smsMode() !== "mock") {
    return NextResponse.json({ error: "not_in_mock_mode" }, { status: 404 });
  }
  const parsed = parseQuery(req, QuerySchema);
  if (!parsed.ok) return parsed.response;
  return NextResponse.json({ otp: await getLastMockOtp(parsed.data.phone) });
}
