import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  getPartnerById,
  getPartnerStats,
  rotatePartnerToken,
  updatePartner,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * GET    → fetch one partner (with rolled-up stats).
 * PATCH  → edit name / email / commission / notes / active.
 * DELETE → soft-deactivate (sets active=false). Hard delete is intentionally
 *          NOT exposed — keeps historical attribution stats accurate.
 * POST   { action: "rotate-token" } → mint a fresh dashboard token.
 */
async function getHandler(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const partner = await getPartnerById(params.id);
  if (!partner) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const stats = await getPartnerStats(partner.id);
  return NextResponse.json({ partner, stats });
}

const PatchInput = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  contactEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  commissionPct: z.number().min(0).max(50).optional(),
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

async function patchHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;

  const updated = await updatePartner(params.id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "partner.updated",
    targetType: "partner",
    targetId: params.id,
    summary: `Edited partner ${updated.code}`,
  });
  return NextResponse.json({ partner: updated });
}

async function deleteHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const updated = await updatePartner(params.id, { active: false });
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "partner.deactivated",
    targetType: "partner",
    targetId: params.id,
    summary: `Deactivated partner ${updated.code}`,
  });
  return NextResponse.json({ ok: true });
}

const PostInput = z.object({
  action: z.literal("rotate-token"),
});

async function postHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PostInput);
  if (!parsed.ok) return parsed.response;

  const updated = await rotatePartnerToken(params.id);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "partner.token-rotated",
    targetType: "partner",
    targetId: params.id,
    summary: `Rotated dashboard token for ${updated.code}`,
  });
  return NextResponse.json({ partner: updated });
}

export const GET = withApiErrorTracking(getHandler);
export const PATCH = withApiErrorTracking(patchHandler);
export const DELETE = withApiErrorTracking(deleteHandler);
export const POST = withApiErrorTracking(postHandler);
