"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import clsx from "clsx";
import { Card, Button, Badge, EmptyState, useToast } from "@/components/ui";
import {
  REWARD_STATUS_TONE,
  commissionRateLabel,
  formatINR,
  formatDate,
} from "@/components/admin/creatorUi";
import type { CommissionType, RewardStatus } from "@/shared/types/creator";

export interface RewardRow {
  id: string;
  creatorId: string;
  creatorName: string;
  paymentId: string;
  commissionType: CommissionType;
  commissionValue: number;
  calculatedAmount: number;
  status: RewardStatus;
  createdAt: string;
}

export function RewardsQueueClient({
  rows,
  status,
  statuses,
}: {
  rows: RewardRow[];
  status: RewardStatus;
  statuses: readonly RewardStatus[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const reason =
        action === "reject"
          ? window.prompt("Reason for rejecting this reward?")?.trim()
          : undefined;
      if (action === "reject" && !reason) return;
      const res = await fetch(`/api/admin/rewards/${id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "reject" ? { reason } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        push({ tone: "error", title: body.error ?? `Could not ${action}.` });
        return;
      }
      push({ tone: "success", title: `Reward ${action}d.` });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/rewards?status=${s}`}
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition",
              s === status
                ? "bg-brand-primary text-white"
                : "bg-neutral-100 text-brand-muted hover:bg-neutral-200",
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card padded>
          <EmptyState
            title={`No ${status} rewards`}
            description="Nothing to review in this view right now."
          />
        </Card>
      ) : (
        <Card padded>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-brand-muted">
                  <th className="py-2 pr-4">Creator</th>
                  <th className="py-2 pr-4">Rate</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/creators/${r.creatorId}`}
                        className="font-medium text-brand-ink hover:underline"
                      >
                        {r.creatorName}
                      </Link>
                      <div className="text-xs text-brand-muted">
                        {r.paymentId}
                      </div>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-brand-muted">
                      {commissionRateLabel(r.commissionType, r.commissionValue)}
                    </td>
                    <td className="py-3 pr-4 font-semibold tabular-nums text-brand-ink">
                      {formatINR(r.calculatedAmount)}
                    </td>
                    <td className="py-3 pr-4 text-brand-muted">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={REWARD_STATUS_TONE[r.status]}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, "reject")}
                            leadingIcon={<X size={14} />}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, "approve")}
                            leadingIcon={<Check size={14} />}
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
