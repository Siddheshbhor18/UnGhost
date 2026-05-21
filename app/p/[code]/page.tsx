import { notFound } from "next/navigation";
import {
  getPartnerStats,
  listPartnerReferrals,
  verifyPartnerToken,
} from "@/server/store";
import { PartnerDashboard } from "@/components/partner/PartnerDashboard";

export const dynamic = "force-dynamic";

interface Props {
  params: { code: string };
  searchParams: { key?: string };
}

/**
 * /p/[code]?key=<token> — partner-facing dashboard.
 *
 * 404 on every invalid combination (no code, no token, wrong token,
 * deactivated partner) so the route never confirms what's valid.
 */
export default async function PartnerPortalPage({ params, searchParams }: Props) {
  const partner = await verifyPartnerToken(
    params.code,
    searchParams.key ?? "",
  );
  if (!partner) notFound();

  const [stats, referrals] = await Promise.all([
    getPartnerStats(partner.id),
    listPartnerReferrals(partner.id, 50),
  ]);

  return (
    <PartnerDashboard
      partner={{
        id: partner.id,
        code: partner.code,
        name: partner.name,
        commissionPct: partner.commissionPct,
      }}
      stats={stats}
      referrals={referrals}
    />
  );
}
