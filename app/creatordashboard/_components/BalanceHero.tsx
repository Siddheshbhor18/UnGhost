"use client";

import { IndianRupee } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { formatINR } from "../_lib/format";

/** The withdrawable-balance hero. High-contrast so the number reads at a glance
 *  on a phone (design rule §5). Shared by Home and Payouts. */
export function BalanceHero({
  balancePaise,
  onRequestPayout,
  subtitle = "Approved earnings, ready to withdraw.",
}: {
  balancePaise: number;
  onRequestPayout: () => void;
  subtitle?: string;
}) {
  return (
    <Card padded className="bg-neutral-900 text-white">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
        Available balance
      </span>
      <p className="mt-1.5 font-display text-4xl font-bold tracking-tight tnum">
        {formatINR(balancePaise)}
      </p>
      <p className="mt-1 text-body-xs text-neutral-400">{subtitle}</p>
      <Button
        className="mt-4"
        fullWidth
        leadingIcon={<IndianRupee size={16} />}
        onClick={onRequestPayout}
      >
        Request payout
      </Button>
    </Card>
  );
}
