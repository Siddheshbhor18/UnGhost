import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  createPartner,
  listPartnersWithStats,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

/**
 * GET /api/admin/partners → list every partner with rolled-up stats.
 * POST /api/admin/partners → create a new partner. Returns the full row
 *                            including the freshly-minted dashboardToken
 *                            so the admin UI can show the shareable URL.
 *
 * Both routes are admin-only.
 */
async function getHandler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const partners = await listPartnersWithStats();
  return NextResponse.json({ partners });
}

const CreateInput = z.object({
  name: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  commissionPct: z.number().min(0).max(50).optional(),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Code must be lowercase letters, digits, hyphens")
    .min(3)
    .max(48)
    .optional(),
  notes: z.string().max(2000).optional(),
});

async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, CreateInput);
  if (!parsed.ok) return parsed.response;

  const partner = await createPartner(parsed.data, session.user.id);
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "partner.created",
    // Was "system" — that meant /admin/audit couldn't filter to partner
    // actions specifically. The shared AuditLog union now includes
    // "partner" as a valid targetType so this is the precise value.
    targetType: "partner",
    targetId: partner.id,
    summary: `Created partner ${partner.code} (${partner.name})`,
  });
  return NextResponse.json({ partner }, { status: 201 });
}

export const GET = withApiErrorTracking(getHandler);
export const POST = withApiErrorTracking(postHandler);
