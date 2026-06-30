import { Coins } from "lucide-react";
import { listRewards } from "@/server/creator/reward.service";
import { getUsersByIds } from "@/server/store";
import { SectionLabel } from "@/components/ui";
import {
  RewardsQueueClient,
  type RewardRow,
} from "@/components/admin/RewardsQueueClient";
import type { RewardStatus } from "@/server/creator/types";

export const dynamic = "force-dynamic";

const STATUSES: readonly RewardStatus[] = [
  "pending",
  "approved",
  "rejected",
  "reversed",
];

function parseStatus(value: string | undefined): RewardStatus {
  return STATUSES.includes(value as RewardStatus)
    ? (value as RewardStatus)
    : "pending";
}

/**
 * /admin/rewards — the reward review queue. Defaults to the pending worklist;
 * `?status=` switches the view (handled server-side so creator names stay
 * enriched across every status). Approve/reject happen client-side via
 * /api/admin/rewards/[id]/*.
 */
export default async function RewardsAdmin({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = parseStatus(searchParams.status);
  const rewards = await listRewards({ status, limit: 500 });
  const users = await getUsersByIds(rewards.map((r) => r.creatorId));

  const rows: RewardRow[] = rewards.map((r) => ({
    id: r.id,
    creatorId: r.creatorId,
    creatorName: users.get(r.creatorId)?.name ?? "Unknown creator",
    paymentId: r.paymentId,
    commissionType: r.commissionType,
    commissionValue: r.commissionValue,
    calculatedAmount: r.calculatedAmount,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <SectionLabel icon={<Coins size={13} />} tone="brand">
          Rewards
        </SectionLabel>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Reward queue
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Review creator rewards. Approving keeps the credit; rejecting writes an
          offsetting debit so balances never inflate.
        </p>
      </div>
      <RewardsQueueClient rows={rows} status={status} statuses={STATUSES} />
    </div>
  );
}
