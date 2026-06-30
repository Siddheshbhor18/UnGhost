"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, IndianRupee } from "lucide-react";
import { Button, Field, Input, Modal, useToast } from "@/components/ui";
import type { CreatorPaymentDetails, PayoutRequest } from "@/server/creator/types";
import { formatINR } from "../_lib/format";
import type { PayoutErrorBody } from "../_lib/api";
import { useCreatorConfig } from "./CreatorConfig";

/**
 * Request-payout sheet, shared by Home and Payouts. Validates against the
 * server-authoritative minimum and the available balance up front, blocks early
 * when payment details are missing/unverified, and surfaces every server gate
 * (no_payment_method · not_verified · below_minimum · insufficient_balance) as
 * a plain-language message.
 */
export function PayoutModal({
  open,
  onClose,
  balancePaise,
  paymentDetails,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  balancePaise: number;
  paymentDetails?: CreatorPaymentDetails;
  onSuccess: () => void;
}) {
  const { minPayoutPaise } = useCreatorConfig();
  const { push } = useToast();
  const [amountStr, setAmountStr] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountStr("");
      setServerError(null);
      setSubmitting(false);
    }
  }, [open]);

  const block: "no_payment_method" | "not_verified" | null = !paymentDetails
    ? "no_payment_method"
    : !paymentDetails.verified
      ? "not_verified"
      : null;

  const rupees = Number(amountStr);
  const hasAmount = amountStr.trim() !== "" && Number.isFinite(rupees) && rupees > 0;
  const amountPaise = hasAmount ? Math.round(rupees * 100) : 0;

  const belowMin = hasAmount && amountPaise < minPayoutPaise;
  const overBalance = hasAmount && amountPaise > balancePaise;
  const canSubmit =
    hasAmount && !belowMin && !overBalance && !block && !submitting;

  const hint = !hasAmount
    ? null
    : belowMin
      ? `Minimum payout is ${formatINR(minPayoutPaise)}.`
      : overBalance
        ? `That's more than your ${formatINR(balancePaise)} balance.`
        : `You'll request ${formatINR(amountPaise)}.`;

  function friendly(body: PayoutErrorBody): string {
    switch (body.error) {
      case "no_payment_method":
        return "Add your bank or UPI details in Settings before withdrawing.";
      case "not_verified":
        return "Your payment details are awaiting admin verification.";
      case "below_minimum":
        return `The minimum payout is ${formatINR(body.detail?.minPaise ?? minPayoutPaise)}.`;
      case "insufficient_balance":
        return `You can withdraw up to ${formatINR(body.detail?.balancePaise ?? balancePaise)}.`;
      default:
        return "Couldn't request the payout. Please try again.";
    }
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/creator/payouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountPaise }),
      });
      if (res.status === 201) {
        const data = (await res.json()) as { payout: PayoutRequest };
        push({
          tone: "success",
          title: "Payout requested",
          description: `${formatINR(data.payout.amountPaise)} is now pending admin review.`,
        });
        onSuccess();
        onClose();
        return;
      }
      const body = (await res.json()) as PayoutErrorBody;
      setServerError(friendly(body));
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request a payout"
      description="Withdraw your available balance to your verified payment method."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting} disabled={!canSubmit}>
            Request payout
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {block && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            <div className="text-body-sm text-neutral-700">
              {block === "no_payment_method"
                ? "You haven't added payment details yet."
                : "Your payment details are awaiting admin verification."}{" "}
              <Link
                href="/creatordashboard/settings"
                className="font-semibold text-brand-500 underline-offset-2 hover:underline"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3.5 py-3 text-body-sm">
          <span className="text-neutral-500">Available balance</span>
          <span className="font-display font-bold tnum text-neutral-900">
            {formatINR(balancePaise)}
          </span>
        </div>

        <Field
          label="Amount to withdraw"
          hint={hint ?? `Minimum ${formatINR(minPayoutPaise)}.`}
          errorMessage={serverError ?? undefined}
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            placeholder="0"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            error={Boolean(serverError) || belowMin || overBalance}
            leadingIcon={<IndianRupee size={15} />}
            disabled={Boolean(block) || submitting}
          />
        </Field>

        {balancePaise >= minPayoutPaise && !block && (
          <button
            type="button"
            onClick={() => setAmountStr(String(balancePaise / 100))}
            className="text-body-sm font-medium text-brand-500 hover:underline"
          >
            Withdraw all ({formatINR(balancePaise)})
          </button>
        )}
      </div>
    </Modal>
  );
}
