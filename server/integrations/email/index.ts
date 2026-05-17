// Email adapter — Resend in prod, console mock in dev.
// Required env for live mode:
//   RESEND_API_KEY  — API key from Resend dashboard
//   RESEND_FROM     — From address, e.g. "unGhost <hello@unghost.com>"

export interface EmailResult {
  ok: boolean;
  channel: "resend" | "mock";
  providerMessageId?: string;
  error?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  /** Plain-text fallback. Either text or html is required. */
  text?: string;
  html?: string;
  /** Reply-to override. */
  replyTo?: string;
}

export function emailMode(): "live" | "mock" {
  return process.env.RESEND_API_KEY ? "live" : "mock";
}

/** Last issued mock token (for verify-email demos). */
const mockTokens = new Map<string, { token: string; ts: number }>();
export function getLastMockEmailToken(email: string): string | undefined {
  return mockTokens.get(email)?.token;
}

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  if (!input.to || !input.subject || (!input.text && !input.html)) {
    return {
      ok: false,
      channel: emailMode() === "live" ? "resend" : "mock",
      error: "missing_fields",
    };
  }
  if (emailMode() === "mock") {
    // eslint-disable-next-line no-console
    console.log("[email:mock] ─────────────────");
    // eslint-disable-next-line no-console
    console.log(`To: ${Array.isArray(input.to) ? input.to.join(", ") : input.to}`);
    // eslint-disable-next-line no-console
    console.log(`Subject: ${input.subject}`);
    // eslint-disable-next-line no-console
    console.log(input.text ?? input.html);
    // eslint-disable-next-line no-console
    console.log("───────────────────────────────");
    return { ok: true, channel: "mock" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "unGhost <noreply@unghost.com>",
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        reply_to: input.replyTo,
      }),
    });
    if (!res.ok) {
      return { ok: false, channel: "resend", error: `Resend ${res.status}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, channel: "resend", providerMessageId: data.id };
  } catch (e) {
    return {
      ok: false,
      channel: "resend",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

/** Helper: email verification link. */
export async function sendVerifyEmail(
  to: string,
  token: string,
): Promise<EmailResult> {
  mockTokens.set(to, { token, ts: Date.now() });
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify-email/${token}`;
  return sendEmail({
    to,
    subject: "Verify your unGhost email",
    text: `Welcome to unGhost. Confirm your email: ${url}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px">
        <h2>Welcome to unGhost</h2>
        <p>Click below to confirm your email.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0191FC;color:#fff;border-radius:12px;text-decoration:none;font-weight:600">Verify email</a></p>
        <p style="color:#666;font-size:13px">Or copy this link: ${url}</p>
        <p style="color:#999;font-size:11px">This link expires in 24 hours.</p>
      </div>`,
  });
}

/** Helper: password-reset link. */
export async function sendPasswordReset(
  to: string,
  token: string,
): Promise<EmailResult> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;
  return sendEmail({
    to,
    subject: "Reset your unGhost password",
    text: `Reset your unGhost password: ${url}\n\nThis link expires in 1 hour. If you didn't request this, ignore.`,
    html: `
      <div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px">
        <h2>Reset your password</h2>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0191FC;color:#fff;border-radius:12px;text-decoration:none;font-weight:600">Reset password</a></p>
        <p style="color:#999;font-size:11px">This link expires in 1 hour. Didn't request it? Ignore this email.</p>
      </div>`,
  });
}
