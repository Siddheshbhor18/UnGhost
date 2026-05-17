// SMS adapter — MSG91 in prod, Redis-backed mock in dev.
//
// Required env for live mode:
//   MSG91_AUTH_KEY    — API key from MSG91 dashboard
//   MSG91_SENDER_ID   — 6-char DLT-approved sender ID (e.g. "UNGHST")
//   MSG91_OTP_TEMPLATE_ID — DLT-approved OTP template
//
// All exported functions return { ok, channel, providerMessageId?, error? } so
// callers don't have to branch on mock vs live.
//
// OTPs are stored in Redis (Upstash in prod, in-memory shim in dev) with:
//   - 10-minute TTL on the code itself
//   - separate 15-minute lockout counter that triggers after 3 wrong attempts
import { redis } from "@/server/db/redis";

export interface SmsResult {
  ok: boolean;
  channel: "msg91" | "mock";
  providerMessageId?: string;
  error?:
    | "otp_expired"
    | "otp_mismatch"
    | "otp_locked"
    | "bad_phone"
    | string;
  /** Mock-mode only — the OTP code shown to the user banner. */
  demoOtp?: string;
}

export function smsMode(): "live" | "mock" {
  return process.env.MSG91_AUTH_KEY ? "live" : "mock";
}

const OTP_TTL_SEC = 600; // 10 minutes
const LOCKOUT_AFTER = 3;
const LOCKOUT_TTL_SEC = 60 * 15; // 15 minutes

function otpKey(phone: string) {
  return `sms:otp:${normalisePhone(phone)}`;
}
function lockKey(phone: string) {
  return `sms:lock:${normalisePhone(phone)}`;
}

function genOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalisePhone(p: string): string {
  return p.replace(/[^\d+]/g, "");
}

/** Mock-mode only — used by the demo banner on /verify-phone. */
export async function getLastMockOtp(phone: string): Promise<string | undefined> {
  if (smsMode() !== "mock") return undefined;
  const stored = await redis().get(otpKey(phone));
  return stored ?? undefined;
}

/** Send a one-time passcode for phone verification or login. */
export async function sendOtp(phone: string): Promise<SmsResult> {
  const cleaned = normalisePhone(phone);
  if (cleaned.replace(/^\+/, "").length < 10) {
    return { ok: false, channel: smsMode() === "live" ? "msg91" : "mock", error: "bad_phone" };
  }
  if (smsMode() === "mock") {
    const otp = genOtp();
    await redis().set(otpKey(cleaned), otp, { ex: OTP_TTL_SEC });
    await redis().del(lockKey(cleaned));
    // eslint-disable-next-line no-console
    console.log(`[sms:mock] OTP ${otp} → ${cleaned}`);
    return { ok: true, channel: "mock", demoOtp: otp };
  }
  try {
    const res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY!,
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_OTP_TEMPLATE_ID,
        mobile: cleaned.replace(/^\+/, ""),
        sender: process.env.MSG91_SENDER_ID,
        otp_expiry: 10,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        channel: "msg91",
        error: `MSG91 returned ${res.status}`,
      };
    }
    const data = (await res.json()) as { type?: string; request_id?: string };
    await redis().del(lockKey(cleaned));
    return {
      ok: data.type === "success",
      channel: "msg91",
      providerMessageId: data.request_id,
    };
  } catch (e) {
    return {
      ok: false,
      channel: "msg91",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

/** Verify a code the user typed. Locks the phone for 15 min after 3 fails. */
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<SmsResult> {
  const cleaned = normalisePhone(phone);
  const r = redis();

  // Lockout gate first — same in both channels.
  const fails = Number((await r.get(lockKey(cleaned))) ?? "0");
  if (fails >= LOCKOUT_AFTER) {
    return {
      ok: false,
      channel: smsMode() === "live" ? "msg91" : "mock",
      error: "otp_locked",
    };
  }

  if (smsMode() === "mock") {
    const stored = await r.get(otpKey(cleaned));
    if (!stored) {
      return { ok: false, channel: "mock", error: "otp_expired" };
    }
    if (stored !== code) {
      const newFails = await r.incr(lockKey(cleaned));
      if (newFails === 1) await r.expire(lockKey(cleaned), LOCKOUT_TTL_SEC);
      return {
        ok: false,
        channel: "mock",
        error: newFails >= LOCKOUT_AFTER ? "otp_locked" : "otp_mismatch",
      };
    }
    await r.del(otpKey(cleaned), lockKey(cleaned));
    return { ok: true, channel: "mock" };
  }

  try {
    const url = new URL("https://control.msg91.com/api/v5/otp/verify");
    url.searchParams.set("mobile", cleaned.replace(/^\+/, ""));
    url.searchParams.set("otp", code);
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { authkey: process.env.MSG91_AUTH_KEY! },
    });
    const data = (await res.json()) as { type?: string; message?: string };
    const ok = data.type === "success";
    if (!ok) {
      const newFails = await r.incr(lockKey(cleaned));
      if (newFails === 1) await r.expire(lockKey(cleaned), LOCKOUT_TTL_SEC);
      return {
        ok: false,
        channel: "msg91",
        error:
          newFails >= LOCKOUT_AFTER ? "otp_locked" : data.message ?? "otp_mismatch",
      };
    }
    await r.del(lockKey(cleaned));
    return { ok: true, channel: "msg91" };
  } catch (e) {
    return {
      ok: false,
      channel: "msg91",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

/** Send a transactional SMS (job-update, SLA breach refund notice, etc). */
export async function sendSms(phone: string, body: string): Promise<SmsResult> {
  const cleaned = normalisePhone(phone);
  if (smsMode() === "mock") {
    // eslint-disable-next-line no-console
    console.log(`[sms:mock] → ${cleaned}: ${body}`);
    return { ok: true, channel: "mock" };
  }
  try {
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: process.env.MSG91_AUTH_KEY!,
      },
      body: JSON.stringify({
        sender: process.env.MSG91_SENDER_ID,
        mobiles: cleaned.replace(/^\+/, ""),
        message: body,
      }),
    });
    if (!res.ok)
      return { ok: false, channel: "msg91", error: `MSG91 ${res.status}` };
    return { ok: true, channel: "msg91" };
  } catch (e) {
    return {
      ok: false,
      channel: "msg91",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
