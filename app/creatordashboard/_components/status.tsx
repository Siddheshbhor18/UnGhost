import { Fragment } from "react";
import clsx from "clsx";
import { Check, Clock, Undo2, X, type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui";
import type { PayoutStatus, RewardStatus } from "@/server/creator/types";

const REWARD_META: Record<
  RewardStatus,
  { tone: BadgeTone; label: string; Icon: LucideIcon }
> = {
  approved: { tone: "success", label: "Approved", Icon: Check },
  pending: { tone: "warning", label: "Pending", Icon: Clock },
  reversed: { tone: "neutral", label: "Reversed", Icon: Undo2 },
  rejected: { tone: "error", label: "Rejected", Icon: X },
};

/** Per-row reward status: ✓ approved · ⏳ pending · ↩ reversed · ✕ rejected. */
export function RewardStatusBadge({ status }: { status: RewardStatus }) {
  const meta = REWARD_META[status];
  return (
    <Badge tone={meta.tone} leadingIcon={<meta.Icon size={12} />}>
      {meta.label}
    </Badge>
  );
}

const PAYOUT_STEPS: { key: PayoutStatus; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "processing", label: "Processing" },
  { key: "paid", label: "Paid" },
];

/** Horizontal progress for a payout: requested → approved → processing → paid.
 *  A rejected payout leaves the happy path, so it renders a clear error badge. */
export function PayoutStepper({
  status,
  reason,
}: {
  status: PayoutStatus;
  reason?: string;
}) {
  if (status === "rejected") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="error" leadingIcon={<X size={12} />}>
          Rejected
        </Badge>
        {reason && <span className="text-body-xs text-neutral-500">{reason}</span>}
      </div>
    );
  }

  const currentIdx = PAYOUT_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-1.5">
      {PAYOUT_STEPS.map((step, i) => {
        const reached = i <= currentIdx;
        return (
          <Fragment key={step.key}>
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold tnum",
                  reached
                    ? "bg-brand-500 text-white"
                    : "bg-neutral-200 text-neutral-400",
                )}
              >
                {reached ? <Check size={11} /> : i + 1}
              </span>
              <span
                className={clsx(
                  "text-body-xs whitespace-nowrap",
                  i === currentIdx
                    ? "font-semibold text-brand-500"
                    : reached
                      ? "font-medium text-neutral-700"
                      : "text-neutral-400",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < PAYOUT_STEPS.length - 1 && (
              <span
                className={clsx(
                  "h-px min-w-[6px] flex-1",
                  i < currentIdx ? "bg-brand-500" : "bg-neutral-200",
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
