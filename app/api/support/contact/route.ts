import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { createSupportTicket } from "@/server/store";
import { sendEmail } from "@/server/integrations/email";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

const CATEGORIES = [
  "account",
  "payment",
  "application",
  "bootcamp",
  "recruiter_dispute",
  "bug_report",
  "press",
  "other",
] as const;

// PRD SLA per category (hours)
const SLA_HOURS: Record<(typeof CATEGORIES)[number], number> = {
  account: 12,
  payment: 4,
  application: 24,
  bootcamp: 24,
  recruiter_dispute: 24,
  bug_report: 24,
  press: 48,
  other: 48,
};

const Input = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  category: z.enum(CATEGORIES),
  message: z.string().trim().min(10).max(5000),
});

/**
 * POST /api/support/contact
 *
 * Public ticket-creation endpoint (also reachable by logged-in users).
 *   1. Persist a SupportTicket row.
 *   2. Email support@unghost.com (Slack-style alert).
 *   3. Email a confirmation receipt to the requester.
 *
 * Rate-limited per IP: 10/hour. Same-origin guard so external scripts can't
 * spam the inbox.
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const { name, email, category, message } = parsed.data;

  const subject = `[${category}] ${message.slice(0, 60).replace(/\s+/g, " ")}${
    message.length > 60 ? "…" : ""
  }`;

  const ticket = await createSupportTicket({
    subject,
    category,
    status: "open",
    priority: category === "payment" ? "high" : "normal",
    requesterEmail: email,
    requesterRole: "student",
    bodyPreview: message,
  });

  const inboundTo = process.env.SUPPORT_INBOX_EMAIL ?? "support@unghost.com";
  const fanOut = await Promise.allSettled([
    // Operator-facing email so support team sees the ticket arrive.
    sendEmail({
      to: inboundTo,
      subject: `[${ticket.id}] ${subject}`,
      replyTo: email,
      text: `From: ${name} <${email}>\nCategory: ${category}\nSLA: ${SLA_HOURS[category]}h\n\n${message}`,
    }),
    // Requester confirmation — SLA expectation sets right tone.
    sendEmail({
      to: email,
      subject: `We got your message · ${ticket.id}`,
      text: `Hi ${name},\n\nThanks for reaching unGhost support. Your ticket id is ${ticket.id}. We aim to respond within ${SLA_HOURS[category]} hours.\n\nYour message:\n${message}\n\n— Team unGhost`,
    }),
  ]);

  for (const r of fanOut) {
    if (r.status === "rejected") {
      logger.warn({ err: r.reason, ticketId: ticket.id }, "support.email-failed");
    }
  }

  return NextResponse.json({
    ok: true,
    ticketId: ticket.id,
    slaHours: SLA_HOURS[category],
  });
}

export const POST = withRateLimit(
  { bucket: "support.contact", limit: 10, windowSec: 3600, by: "ip" },
  withApiErrorTracking(handler),
);
