import { Users, Wallet, Clock, TrendingUp } from "lucide-react"
import { listCreators } from "@/server/creator/creator.service";
import { getActiveAgreement } from "@/server/creator/commission.service";
import { getBalance } from "@/server/creator/ledger.service";
import { listRewards } from "@/server/creator/reward.service";
import { listAllPayouts } from "@/server/creator/payout.service";
import { getUsersByIds } from "@/server/store";
import { Stat } from "@/components/ui";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CreatorsClient, type CreatorRow } from "@/components/admin/CreatorsClient";
import { formatINR } from "@/components/admin/creatorUi";

export const dynamic = "force-dynamic";

// A wide cap so the count/sum KPIs stay accurate as volume grows. Admin CRM
// reads are low-frequency and bounded; this is not a hot path.
const REWARD_SCAN_LIMIT = 10_000;

/**
 * /admin/creators — admin Creator CRM roster.
 *
 *   • 4 KPI cards: active creators, total paid out, pending rewards, and an
 *     attributed-revenue proxy (sum of approved reward snapshots).
 *   • A searchable, status-filtered table of every creator with their active
 *     commission, lifetime earnings, derived balance, and copyable link.
 *
 * Reads services directly (server component). All mutations happen client-side
 * through the /api/admin/creators routes.
 */
export default async function CreatorsAdmin() {
  const creators = await listCreators();

  const [users, approvedRewards, pendingRewards, paidPayouts] = await Promise.all([
    getUsersByIds(creators.map((c) => c.creatorId)),
    listRewards({ status: "approved", limit: REWARD_SCAN_LIMIT }),
    listRewards({ status: "pending", limit: REWARD_SCAN_LIMIT }),
    listAllPayouts("paid"),
  ]);

  // One scan of approved rewards powers both the attributed-revenue KPI and
  // each creator's lifetime-earned figure — no per-creator reward query.
  const lifetimeByCreator = new Map<string, number>();
  let attributedRevenuePaise = 0;
  for (const r of approvedRewards) {
    attributedRevenuePaise += r.calculatedAmount;
    lifetimeByCreator.set(
      r.creatorId,
      (lifetimeByCreator.get(r.creatorId) ?? 0) + r.calculatedAmount,
    );
  }

  const activeCount = creators.filter((c) => c.status === "active").length;
  const totalPaidOutPaise = paidPayouts.reduce((sum, p) => sum + p.grossPaise, 0);

  // Per-creator balance + active agreement, capped to the listed creators.
  const rows: CreatorRow[] = await Promise.all(
    creators.map(async (c): Promise<CreatorRow> => {
      const [balancePaise, activeAgreement] = await Promise.all([
        getBalance(c.creatorId),
        getActiveAgreement(c.creatorId),
      ]);
      const user = users.get(c.creatorId);
      return {
        creatorId: c.creatorId,
        referralCode: c.referralCode,
        status: c.status,
        name: user?.name ?? "Unknown creator",
        email: user?.email ?? "",
        balancePaise,
        lifetimePaise: lifetimeByCreator.get(c.creatorId) ?? 0,
        commissionType: activeAgreement?.type ?? null,
        commissionValue: activeAgreement?.value ?? null,
      };
    }),
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <AdminPageHeader
        badge="Creators"
        title="Creator CRM"
        subtitle="Onboard creators with an individually negotiated commission, hand them a permanent referral link, and manage their lifecycle, rewards, and payouts from one place."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Active creators"
          value={activeCount}
          icon={<Users size={16} />}
          tone="brand"
        />
        <Stat
          label="Total paid out"
          value={formatINR(totalPaidOutPaise)}
          icon={<Wallet size={16} />}
          tone="success"
        />
        <Stat
          label="Pending rewards"
          value={pendingRewards.length}
          icon={<Clock size={16} />}
          tone="warning"
        />
        <Stat
          label="Attributed revenue"
          value={formatINR(attributedRevenuePaise)}
          sub="Approved reward snapshots"
          icon={<TrendingUp size={16} />}
          tone="brand"
        />
      </div>

      <CreatorsClient initial={rows} />
    </div>
  );
}
