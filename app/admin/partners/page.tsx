/**
 * @deprecated Superseded by the Creator system (`/admin/creators`) and the
 * one-way migration `scripts/migrate-partners-to-creators.ts`. Partner writes
 * are FROZEN pending cutover — do not add new mutations here. Kept read-only
 * and operational until Creator parity is runtime-confirmed; behaviour below
 * is intentionally unchanged.
 */
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { listPartnersWithStats } from "@/server/store";
import { PartnersClient } from "@/components/admin/PartnersClient";


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
      <AdminPageHeader
        badge="Partners"
        title="Channel partners"
        subtitle="Legacy program, superseded by Creators; read-only until cutover. Issue referral links, track conversions and commission per partner."
      />

      <PartnersClient initial={partners} />
    </div>
  );
}
