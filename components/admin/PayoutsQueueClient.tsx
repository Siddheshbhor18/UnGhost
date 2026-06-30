"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  Card,
  Button,
  Badge,
  Modal,
  Field,
  Input,
  EmptyState,
  useToast,
} from "@/components/ui";
import {
  PAYOUT_STATUS_TONE,
  formatINR,
  formatDate,
} from "@/components/admin/creatorUi";
import type { PaymentMethod, PayoutStatus } from "@/shared/types/creator";

export interface PayoutRow {
  id: string;
  creatorId: string;
  creatorName: string;
  grossPaise: number;
  tdsPaise?: number;
  netPaise: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  status: PayoutStatus;
  requestedAt: string;
}

export function PayoutsQueueClient({
  rows,
  active,
  statuses,
}: {
  rows: PayoutRow[];
  active?: string;
  statuses: readonly PayoutStatus[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<PayoutRow | null>(null);

  async function simpleAction(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const reason =
        action === "reject"
          ? window.prompt("Reason for rejecting this payout?")?.trim()
          : undefined;
      if (action === "reject" && !reason) return;
      const res = await fetch(`/api/admin/payouts/${id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "reject" ? { reason } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        push({ tone: "error", title: body.error ?? `Could not ${action}.` });
        return;
      }
      push({ tone: "success", title: `Payout ${action}d.` });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/payouts"
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium transition",
            !active
              ? "bg-brand-primary text-white"
              : "bg-neutral-100 text-brand-muted hover:bg-neutral-200",
          )}
        >
          All
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/payouts?status=${s}`}
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-medium capitalize transition",
              s === active
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
            title="No payouts here"
            description="Nothing matches this filter right now."
          />
        </Card>
      ) : (
        <Card padded>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-brand-muted">
                  <th className="py-2 pr-4">Creator</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Requested</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/creators/${p.creatorId}`}
                        className="font-medium text-brand-ink hover:underline"
                      >
                        {p.creatorName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-semibold tabular-nums text-brand-ink">
                      {formatINR(p.grossPaise)}
                      {p.status === "paid" && p.netPaise !== p.grossPaise && (
                        <span className="ml-1 text-xs font-normal text-brand-muted">
                          (net {formatINR(p.netPaise)})
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 uppercase text-brand-muted">
                      {p.paymentMethod === "bank_transfer" ? "Bank" : "UPI"}
                    </td>
                    <td className="py-3 pr-4 text-brand-muted">
                      {formatDate(p.requestedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={PAYOUT_STATUS_TONE[p.status]}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === "requested" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === p.id}
                              onClick={() => simpleAction(p.id, "reject")}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              disabled={busyId === p.id}
                              onClick={() => simpleAction(p.id, "approve")}
                            >
                              Approve
                            </Button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === p.id}
                              onClick={() => simpleAction(p.id, "reject")}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setProcessing(p)}
                            >
                              Process
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {processing && (
        <ProcessModal
          payout={processing}
          onClose={() => setProcessing(null)}
          onDone={() => {
            setProcessing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ProcessModal({
  payout,
  onClose,
  onDone,
}: {
  payout: PayoutRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const { push } = useToast();
  const [reference, setReference] = useState("");
  const [tdsRupees, setTdsRupees] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tdsPaise = tdsRupees.trim() ? Math.round(Number(tdsRupees) * 100) : 0;
  const validTds =
    Number.isFinite(tdsPaise) && tdsPaise >= 0 && tdsPaise <= payout.grossPaise;
  const netPaise = payout.grossPaise - (validTds ? tdsPaise : 0);
  const canSubmit = reference.trim().length > 0 && validTds && !submitting;

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/payouts/${payout.id}/process`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentReference: reference.trim(),
          tdsPaise: tdsPaise > 0 ? tdsPaise : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        push({ tone: "error", title: body.error ?? "Could not process payout." });
        return;
      }
      push({ tone: "success", title: "Payout marked paid." });
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Process ${formatINR(payout.grossPaise)} payout`}>
      <div className="space-y-4">
        <Field label="Payment reference" required hint="UTR / transaction id of the transfer">
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UTR123456789"
          />
        </Field>
        <Field
          label="TDS withheld (₹, optional)"
          hint={`Net to creator: ${formatINR(netPaise)}`}
          errorMessage={!validTds ? "TDS can't exceed the gross amount." : undefined}
        >
          <Input
            value={tdsRupees}
            inputMode="decimal"
            onChange={(e) => setTdsRupees(e.target.value)}
            placeholder="0"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} loading={submitting} onClick={submit}>
            Mark paid
          </Button>
        </div>
      </div>
    </Modal>
  );
}
