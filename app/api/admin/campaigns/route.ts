/**
 * /api/admin/campaigns — list + create.
 *
 * Admin-only. Replaces the previous hardcoded SEED array on
 * /admin/campaigns. Campaigns landing on `placement: "landing_hero"` etc.
 * are read by `listLiveCampaigns(placement)` at render time, so anything
 * an admin saves here actually shows up on the public site within the
 * landing-page cache TTL (~60 s).
 *
 *   GET   → all campaigns, newest first
 *   POST  → create with server-generated id
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { listCampaigns, upsertCampaign, writeAuditLog } from "@/server/store";
import { logger } from "@/server/lib/logger";

const PLACEMENTS = [
  "landing_hero",
  "dashboard_top",
  "bootcamp_inline",
] as const;
const STATUSES = ["draft", "live", "paused"] as const;

// Public-facing surface — landing hero, dashboard top, bootcamp inline. Both
// URL fields land in `href=`/`src=` attributes. Restricting to http(s) or
// same-origin relative paths defends against a compromised admin (or session
// hijack) planting a `javascript:` payload that would XSS every visitor. Empty
// string is preserved for the "clear" UX.
const httpOrRelative = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/"),
    { message: "url must be http(s) or a same-origin path" },
  );

const inputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  placement: z.enum(PLACEMENTS),
  mediaUrl: httpOrRelative.optional().or(z.literal("")),
  headline: z.string().trim().min(2).max(140),
  subtext: z.string().trim().max(280).optional().or(z.literal("")),
  targetUrl: httpOrRelative.refine((v) => v.length >= 1, {
    message: "targetUrl required",
  }),
  status: z.enum(STATUSES).default("draft"),
});

// Discriminated union so callers narrow via `if ('err' in r)` without
// TS complaining that adminId could still be undefined on the happy path.
type GateResult =
  | { err: NextResponse; adminId?: never }
  | { err?: never; adminId: string };

async function assertAdmin(): Promise<GateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "admin") {
    return {
      err: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { adminId: session.user.id };
}

export async function GET(): Promise<NextResponse> {
  const auth = await assertAdmin();
  if (auth.err) return auth.err;
  const campaigns = await listCampaigns();
  // Newest first — matches the admin's intuition of "what did I just create".
  campaigns.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request): Promise<NextResponse> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await assertAdmin();
  if (auth.err) return auth.err;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const id = `camp_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  // Cast through unknown — the shared Campaign type expects a few extra
  // tracking fields we don't bother to fill at create-time (DB defaults).
  const campaign = await upsertCampaign({
    id,
    name: parsed.data.name,
    placement: parsed.data.placement,
    mediaUrl: parsed.data.mediaUrl ?? "",
    headline: parsed.data.headline,
    subtext: parsed.data.subtext ?? "",
    targetUrl: parsed.data.targetUrl,
    status: parsed.data.status,
    createdAt: new Date().toISOString().slice(0, 10),
  } as never);

  await writeAuditLog({
    actorId: auth.adminId,
    actorRole: "admin",
    action: "campaign.created",
    targetType: "campaign",
    targetId: id,
    summary: `Created campaign "${parsed.data.name}" (${parsed.data.placement}, ${parsed.data.status})`,
  });

  logger.info(
    { campaignId: id, adminId: auth.adminId },
    "admin.campaign.created",
  );

  return NextResponse.json({ campaign }, { status: 201 });
}
