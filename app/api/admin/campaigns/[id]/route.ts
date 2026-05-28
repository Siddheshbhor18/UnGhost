/**
 * /api/admin/campaigns/[id] — patch + delete.
 *
 * PATCH any subset of name/placement/mediaUrl/headline/subtext/targetUrl/status.
 * DELETE removes the campaign entirely. Both admin-only, both audited.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  deleteCampaign,
  listCampaigns,
  upsertCampaign,
  writeAuditLog,
} from "@/server/store";
import { logger } from "@/server/lib/logger";

const PLACEMENTS = [
  "landing_hero",
  "dashboard_top",
  "bootcamp_inline",
] as const;
const STATUSES = ["draft", "live", "paused"] as const;

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  placement: z.enum(PLACEMENTS).optional(),
  mediaUrl: z.string().trim().max(500).optional(),
  headline: z.string().trim().min(2).max(140).optional(),
  subtext: z.string().trim().max(280).optional(),
  targetUrl: z.string().trim().min(1).max(500).optional(),
  status: z.enum(STATUSES).optional(),
});

// Discriminated union — see the matching helper in ../route.ts for rationale.
type GateResult =
  | { err: NextResponse; adminId?: never }
  | { err?: never; adminId: string };

async function gate(): Promise<GateResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (session.user.role !== "admin") {
    return { err: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { adminId: session.user.id };
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const auth = await gate();
  if (auth.err) return auth.err;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // upsertCampaign expects a full Campaign object; merge the patch onto
  // the existing row first so unmodified fields aren't blanked out.
  const all = await listCampaigns();
  const existing = all.find((c) => c.id === params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const merged = { ...existing, ...parsed.data } as typeof existing;
  await upsertCampaign(merged);

  await writeAuditLog({
    actorId: auth.adminId,
    actorRole: "admin",
    action: "campaign.updated",
    targetType: "campaign",
    targetId: params.id,
    summary: `Updated campaign "${merged.name}" — fields: ${Object.keys(parsed.data).join(", ")}`,
  });

  logger.info(
    {
      campaignId: params.id,
      adminId: auth.adminId,
      fields: Object.keys(parsed.data),
    },
    "admin.campaign.updated",
  );

  return NextResponse.json({ campaign: merged });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const csrf = requireSameOrigin(_req);
  if (csrf) return csrf;
  const auth = await gate();
  if (auth.err) return auth.err;

  const removed = await deleteCampaign(params.id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeAuditLog({
    actorId: auth.adminId,
    actorRole: "admin",
    action: "campaign.deleted",
    targetType: "campaign",
    targetId: params.id,
    summary: `Deleted campaign ${params.id}`,
  });

  logger.info(
    { campaignId: params.id, adminId: auth.adminId },
    "admin.campaign.deleted",
  );

  return NextResponse.json({ ok: true });
}
