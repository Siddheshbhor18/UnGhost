import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Category =
  | "account"
  | "payment"
  | "application"
  | "bootcamp"
  | "recruiter_dispute"
  | "bug_report"
  | "press"
  | "other";

const CATEGORIES: Category[] = [
  "account",
  "payment",
  "application",
  "bootcamp",
  "recruiter_dispute",
  "bug_report",
  "press",
  "other",
];

// PRD SLA per category (hours)
const SLA_HOURS: Record<Category, number> = {
  account: 12,
  payment: 4,
  application: 24,
  bootcamp: 24,
  recruiter_dispute: 24,
  bug_report: 24,
  press: 48,
  other: 48,
};

interface Body {
  name: string;
  email: string;
  category: Category;
  message: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
    return NextResponse.json(
      { error: "name, email, message required" },
      { status: 400 },
    );
  }
  if (!CATEGORIES.includes(body.category)) {
    return NextResponse.json(
      { error: "invalid category" },
      { status: 400 },
    );
  }
  if (!/\S+@\S+\.\S+/.test(body.email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (body.message.length > 5000) {
    return NextResponse.json(
      { error: "message must be under 5000 chars" },
      { status: 400 },
    );
  }

  // Real impl: persist to supportTickets collection + send Resend confirmation
  // Phase 1: log + return ticket ID
  const ticketId = `TIK_${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
  console.log("[support] new ticket", {
    ticketId,
    ...body,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    ticketId,
    slaHours: SLA_HOURS[body.category],
  });
}
