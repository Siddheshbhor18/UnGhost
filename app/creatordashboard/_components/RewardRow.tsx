import clsx from "clsx";
import type { CreatorReward } from "@/server/creator/types";
import { formatDate, formatINR } from "../_lib/format";
import { RewardStatusBadge } from "./status";

/** One earning line: amount + date on the left, status on the right. Rewards
 *  that never pay out (rejected/reversed) are struck through so the payable set
 *  is unambiguous (design rule §5: "Status honesty"). */
export function RewardRow({ reward }: { reward: CreatorReward }) {
  const dead = reward.status === "rejected" || reward.status === "reversed";
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p
          className={clsx(
            "font-display font-semibold tnum tracking-tight",
            dead ? "text-neutral-400 line-through" : "text-neutral-900",
          )}
        >
          {formatINR(reward.calculatedAmount)}
        </p>
        <p className="mt-0.5 text-body-xs text-neutral-500">
          {formatDate(reward.createdAt)}
        </p>
      </div>
      <RewardStatusBadge status={reward.status} />
    </div>
  );
}
