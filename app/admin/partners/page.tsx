/**
 * @deprecated Superseded by the Creator system (`/admin/creators`) and the
 * one-way migration `scripts/migrate-partners-to-creators.ts`. Partner writes
 * are FROZEN pending cutover — do not add new mutations here. Kept read-only
 * and operational until Creator parity is runtime-confirmed; behaviour below
 * is intentionally unchanged.
 */
import { GlassBadge } from "@/components/glass";
import { listPartnersWithStats } from "@/server/store";
import { PartnersClient } from "@/components/admin/PartnersClient";
import { Handshake } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /admin/partners — admin-only channel-partner manager.
 *
 *   • Table of every partner with signups, paid conversions, est. commission.
 *   • Create / edit / deactivate / rotate-token actions.
 *   • Each row shows the shareable dashboard URL with a copy button.
 *
 * Auth is handled at the `/admin` layout level — non-admins never reach here.
 */
export default async function PartnersAdmin() {
  const partners = await listPartnersWithStats();

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <GlassBadge tone="brand">
            <Handshake size={11} /> Partners
          </GlassBadge>
          <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
            Channel Partners
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Issue unique referral links. Track conversions + commission per
            partner. Each link doubles as the partner's dashboard URL.
          </p>
        </div>
      </div>

      <PartnersClient initial={partners} />
    </div>
  );
}
