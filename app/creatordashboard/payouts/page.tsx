"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Card, EmptyState, SectionLabel, Skeleton } from "@/components/ui";
import { useApi, PageState } from "../_components/useApi";
import { BalanceHero } from "../_components/BalanceHero";
import { PayoutModal } from "../_components/PayoutModal";
import { PayoutStepper } from "../_components/status";
import type { DashboardResponse, PayoutsResponse } from "../_lib/api";
import type { PayoutRequest } from "@/server/creator/types";
import { formatDate, formatINR } from "../_lib/format";

export default function PayoutsPage() {
  const dashboard = useApi<DashboardResponse>("/api/creator/dashboard");
  const payouts = useApi<PayoutsResponse>("/api/creator/payouts");

  function refresh() {
    dashboard.reload();
    payouts.reload();
  }

  return (
    <div className="space-y-4 py-4">
      <div>
        <SectionLabel icon={<Wallet size={13} />} tone="brand">
          Payouts
        </SectionLabel>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900">
          Withdraw your balance
        </h1>
      </div>

      <PageState query={dashboard} skeleton={<PayoutsSkeleton />}>
        {(data) => (
          <PayoutsBody
            data={data}
            payouts={payouts.data?.payouts ?? null}
            loadingPayouts={payouts.loading}
            onChange={refresh}
          />
        )}
      </PageState>
    </div>
  );
}

function PayoutsBody({
  data,
  payouts,
  loadingPayouts,
  onChange,
}: {
  data: DashboardResponse;
  payouts: PayoutRequest[] | null;
  loadingPayouts: boolean;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const details = data.profile?.paymentDetails;

  return (
    <div className="space-y-4">
      <BalanceHero
        balancePaise={data.balancePaise}
        onRequestPayout={() => setOpen(true)}
        subtitle={
          !details
            ? "Add payment details in Settings to withdraw."
            : !details.verified
              ? "Payment details awaiting admin verification."
              : "Approved earnings, ready to withdraw."
        }
      />

      <Card padded>
        <SectionLabel>Payout history</SectionLabel>
        {loadingPayouts && !payouts ? (
          <div className="mt-3 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} shape="block" height={56} className="rounded-lg" />
            ))}
          </div>
        ) : !payouts || payouts.length === 0 ? (
          <EmptyState
            title="No payouts yet"
            description="Once you request a withdrawal, you can track it here from requested to paid."
            illustration={<Wallet size={30} strokeWidth={1.6} />}
          />
        ) : (
          <div className="mt-1 divide-y divide-neutral-100">
            {payouts.map((payout) => (
              <PayoutRow key={payout.id} payout={payout} />
            ))}
          </div>
        )}
      </Card>

      <PayoutModal
        open={open}
        onClose={() => setOpen(false)}
        balancePaise={data.balancePaise}
        paymentDetails={details}
        onSuccess={onChange}
      />
    </div>
  );
}

function PayoutRow({ payout }: { payout: PayoutRequest }) {
  const tds = payout.tdsPaise ?? 0;
  return (
    <div className="space-y-2.5 py-4 first:pt-3 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-semibold tnum tracking-tight text-neutral-900">
            {formatINR(payout.amountPaise)}
          </p>
          <p className="mt-0.5 text-body-xs text-neutral-500">
            Requested {formatDate(payout.requestedAt)}
          </p>
        </div>
        {payout.status === "paid" && payout.paidAt && (
          <span className="shrink-0 text-body-xs text-neutral-500">
            Paid {formatDate(payout.paidAt)}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <PayoutStepper status={payout.status} reason={payout.rejectedReason} />
      </div>

      {payout.status === "paid" && tds > 0 && (
        <p className="text-body-xs text-neutral-500">
          Net {formatINR(payout.netPaise)} after {formatINR(tds)} TDS
          {payout.paymentReference ? ` · Ref ${payout.paymentReference}` : ""}
        </p>
      )}
    </div>
  );
}

function PayoutsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton shape="block" height={150} className="rounded-lg" />
      <Skeleton shape="block" height={220} className="rounded-lg" />
    </div>
  );
}
