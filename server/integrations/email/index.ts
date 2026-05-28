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
        from: process.env.RESEND_FROM ?? "unGhost <noreply@unghost.in>",
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

// ─────────────────────────────────────────────────────────────────────────
//  BOOTCAMP PAYMENT / ENROLLMENT TRANSACTIONAL EMAILS
//  Fired by the QR-payment flow. Replaces the MSG91 SMS path entirely.
//  Promised activation window is 20 minutes — keep the copy aligned with
//  the UI confirmation toast on the enrollment page.
// ─────────────────────────────────────────────────────────────────────────

/** Helper: confirms receipt of a QR-payment submission (admin still verifying). */
export async function sendPaymentReceived(
  to: string,
  vars: { name: string; bootcampTitle: string; utr: string },
): Promise<EmailResult> {
  const { name, bootcampTitle, utr } = vars;
  return sendEmail({
    to,
    subject: `We received your payment for ${bootcampTitle}`,
    text: `Hi ${name},\n\nWe received your UPI payment for "${bootcampTitle}" (UTR: ${utr}).\n\nOur team is verifying it now. Your account will be activated within ~20 minutes. You'll get a confirmation email once you're in.\n\nIf you have questions, reply to this email.\n\n— Team unGhost`,
    html: `
      <div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px;color:#1A1816">
        <h2 style="margin:0 0 12px 0">Payment received ✓</h2>
        <p>Hi ${name},</p>
        <p>We received your UPI payment for <strong>${bootcampTitle}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:4px 12px 4px 0;color:#666">UTR</td><td style="padding:4px 0;font-family:monospace">${utr}</td></tr>
        </table>
        <p>Our team is verifying it now. <strong>Your account will be activated within ~20 minutes.</strong> You'll get a confirmation email once you're in.</p>
        <p style="color:#666;font-size:13px">Questions? Reply to this email.</p>
        <p style="color:#999;font-size:11px;margin-top:24px">— Team unGhost</p>
      </div>`,
  });
}

/** Helper: enrollment approved — student now has dashboard access. */
export async function sendEnrollmentApproved(
  to: string,
  vars: { name: string; bootcampTitle: string },
): Promise<EmailResult> {
  const { name, bootcampTitle } = vars;
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard`;
  return sendEmail({
    to,
    subject: `You're enrolled in ${bootcampTitle} 🎉`,
    text: `Hi ${name},\n\nYou're officially enrolled in "${bootcampTitle}".\n\nHead to your dashboard to see the schedule and join the first session:\n${dashboardUrl}\n\nLet's go.\n\n— Team unGhost`,
    html: `
      <div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px;color:#1A1816">
        <h2 style="margin:0 0 12px 0">You're in 🎉</h2>
        <p>Hi ${name},</p>
        <p>You're officially enrolled in <strong>${bootcampTitle}</strong>.</p>
        <p><a href="${dashboardUrl}" style="display:inline-block;padding:12px 20px;background:#0191FC;color:#fff;border-radius:12px;text-decoration:none;font-weight:600">Open your dashboard</a></p>
        <p style="color:#666;font-size:13px">You'll see your bootcamp schedule, joining links for live sessions (visible 15 min before start), and recordings as they're posted.</p>
        <p style="color:#999;font-size:11px;margin-top:24px">— Team unGhost</p>
      </div>`,
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  SAVED-SEARCH WEEKLY DIGEST
//  Fired by the /api/cron/saved-search-digest Vercel cron (Mon 9 AM UTC).
//  Recruiters opt into weekly digests on the Saved Searches page; this
//  email is the only place that promise is fulfilled.
// ─────────────────────────────────────────────────────────────────────────

export interface SavedSearchDigestMatch {
  /** Human-readable label, e.g. candidate name or "React dev · Bengaluru". */
  jobOrCandidateLabel: string;
  /** Absolute or app-relative deep link to view the match. */
  link: string;
  /** 1-line summary of the match (skills, city, etc.). */
  summary: string;
  /** Which saved search produced this match (header within the email). */
  savedSearchName?: string;
}

/** Helper: weekly digest of new matching candidates for a recruiter. */
export async function sendSavedSearchDigest(
  to: string,
  vars: { name: string; matches: SavedSearchDigestMatch[] },
): Promise<EmailResult> {
  const { name, matches } = vars;
  if (matches.length === 0) {
    return { ok: false, channel: emailMode() === "live" ? "resend" : "mock", error: "no_matches" };
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const absolute = (link: string) =>
    link.startsWith("http") ? link : `${base}${link.startsWith("/") ? "" : "/"}${link}`;

  // Group by savedSearchName so multiple saved searches collapse into one email.
  const groups = new Map<string, SavedSearchDigestMatch[]>();
  for (const m of matches) {
    const key = m.savedSearchName ?? "Your saved search";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const total = matches.length;
  const subject = `${total} new ${total === 1 ? "match" : "matches"} from your saved searches this week`;

  const textGroups = Array.from(groups.entries())
    .map(([groupName, list]) => {
      const lines = list
        .map((m) => `  • ${m.jobOrCandidateLabel} — ${m.summary}\n    ${absolute(m.link)}`)
        .join("\n");
      return `${groupName} (${list.length})\n${lines}`;
    })
    .join("\n\n");

  const text = `Hi ${name},\n\nHere's what's new on unGhost this week from your saved searches:\n\n${textGroups}\n\nReview them on your dashboard: ${base}/recruiter/saved-searches\n\n— Team unGhost`;

  const htmlGroups = Array.from(groups.entries())
    .map(([groupName, list]) => {
      const items = list
        .map(
          (m) => `
          <li style="margin:0 0 14px 0;padding:0">
            <a href="${absolute(m.link)}" style="color:#0191FC;text-decoration:none;font-weight:600">${m.jobOrCandidateLabel}</a>
            <div style="color:#666;font-size:13px;margin-top:2px">${m.summary}</div>
          </li>`,
        )
        .join("");
      return `
        <div style="margin:20px 0 8px 0">
          <p style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#999;font-weight:600">
            ${groupName} · ${list.length} new
          </p>
          <ul style="list-style:none;padding:0;margin:0">${items}</ul>
        </div>`;
    })
    .join("");

  const dashUrl = `${base}/recruiter/saved-searches`;
  return sendEmail({
    to,
    subject,
    text,
    html: `
      <div style="font-family:system-ui,sans-serif;padding:24px;max-width:600px;color:#1A1816">
        <h2 style="margin:0 0 12px 0">${total} new ${total === 1 ? "match" : "matches"} this week</h2>
        <p>Hi ${name},</p>
        <p>Here's what's new on unGhost from your saved searches in the last 7 days:</p>
        ${htmlGroups}
        <p style="margin-top:24px">
          <a href="${dashUrl}" style="display:inline-block;padding:12px 20px;background:#0191FC;color:#fff;border-radius:12px;text-decoration:none;font-weight:600">Open saved searches</a>
        </p>
        <p style="color:#666;font-size:13px;margin-top:16px">
          You're getting this because you set one or more saved searches to <strong>weekly</strong> alerts. Change the frequency anytime from your dashboard.
        </p>
        <p style="color:#999;font-size:11px;margin-top:24px">— Team unGhost</p>
      </div>`,
  });
}

/** Helper: enrollment rejected — payment couldn't be verified. */
export async function sendEnrollmentRejected(
  to: string,
  vars: { name: string; bootcampTitle: string; reason: string },
): Promise<EmailResult> {
  const { name, bootcampTitle, reason } = vars;
  const retryUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/bootcamps`;
  return sendEmail({
    to,
    subject: `We couldn't verify your payment for ${bootcampTitle}`,
    text: `Hi ${name},\n\nWe weren't able to verify your payment for "${bootcampTitle}".\n\nReason: ${reason}\n\nIf this was a mistake, please resubmit with the correct details:\n${retryUrl}\n\nIf you've actually paid and believe this is a verification error, reply to this email with a screenshot of the UPI transaction and we'll sort it within 24 hours.\n\n— Team unGhost`,
    html: `
      <div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px;color:#1A1816">
        <h2 style="margin:0 0 12px 0">Payment couldn't be verified</h2>
        <p>Hi ${name},</p>
        <p>We weren't able to verify your payment for <strong>${bootcampTitle}</strong>.</p>
        <div style="background:#FEF2F2;border-left:3px solid #DC2626;padding:12px 16px;margin:16px 0;border-radius:6px">
          <p style="margin:0;color:#7F1D1D"><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>If this was a mistake, please resubmit with the correct details:</p>
        <p><a href="${retryUrl}" style="display:inline-block;padding:12px 20px;background:#0191FC;color:#fff;border-radius:12px;text-decoration:none;font-weight:600">Resubmit payment</a></p>
        <p style="color:#666;font-size:13px">If you've actually paid and believe this is a verification error, reply to this email with a screenshot of the UPI transaction and we'll sort it within 24 hours.</p>
        <p style="color:#999;font-size:11px;margin-top:24px">— Team unGhost</p>
      </div>`,
  });
}
