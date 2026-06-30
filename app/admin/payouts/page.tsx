import { Wallet } from "lucide-react";
import { listAllPayouts } from "@/server/creator/payout.service";
import { getUsersByIds } from "@/server/store";
import { SectionLabel } from "@/components/ui";
import {
  PayoutsQueueClient,
  type PayoutRow,
} from "@/components/admin/PayoutsQueueClient";
import type { PayoutStatus } from "@/server/creator/types";

export const dynamic = "force-dynamic";

const STATUSES: readonly PayoutStatus[] = [
  "requested",
  "approved",
  "processing",
  "paid",
  "rejected",
];

function parseStatus(value: string | undefined): PayoutStatus | undefined {
  return STATUSES.includes(value as PayoutStatus)
    ? (value as PayoutStatus)
    : undefined; // undefined → all
}

/**
 * /admin/payouts — payout worklist. Default shows every request; `?status=`
 * narrows it. Approve / process (with a payment reference + optional TDS) /
 * reject happen client-side via /api/admin/payouts/[id]/*.
 */
export default async function PayoutsAdmin({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = parseStatus(searchParams.status);
  const payouts = await listAllPayouts(status);
  const users = await getUsersByIds(payouts.map((p) => p.creatorId));

  const rows: PayoutRow[] = payouts.map((p) => ({
    id: p.id,
    creatorId: p.creatorId,
    creatorName: users.get(p.creatorId)?.name ?? "Unknown creator",
    grossPaise: p.grossPaise,
    tdsPaise: p.tdsPaise,
    netPaise: p.netPaise,
    paymentMethod: p.paymentMethod,
    paymentReference: p.paymentReference,
    status: p.status,
    requestedAt: p.requestedAt,
  }));

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <SectionLabel icon={<Wallet size={13} />} tone="brand">
          Payouts
        </SectionLabel>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Payout queue
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Approve requests, then process with a payment reference. Processing
          writes the ledger debit.
        </p>
      </div>
      <PayoutsQueueClient
        rows={rows}
        active={searchParams.status}
        statuses={STATUSES}
      />
    </div>
  );
}
