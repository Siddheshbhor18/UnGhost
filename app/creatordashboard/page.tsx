"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Coins, IndianRupee, Users } from "lucide-react";
import { Card, EmptyState, Skeleton, Stat } from "@/components/ui";
import { useApi, PageState } from "./_components/useApi";
import { CopyButton } from "./_components/CopyButton";
import { ReferralLinkCard } from "./_components/ReferralLinkCard";
import { RewardRow } from "./_components/RewardRow";
import { PayoutModal } from "./_components/PayoutModal";
import { BalanceHero } from "./_components/BalanceHero";
import type { DashboardResponse } from "./_lib/api";
import { formatINR } from "./_lib/format";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export default function CreatorHomePage() {
  const query = useApi<DashboardResponse>("/api/creator/dashboard");

  return (
    <div className="py-4">
      <PageState query={query} skeleton={<HomeSkeleton />}>
        {(data) => <Home data={data} onChange={query.reload} />}
      </PageState>
    </div>
  );
}

function Home({
  data,
  onChange,
}: {
  data: DashboardResponse;
  onChange: () => void;
}) {
  const [payoutOpen, setPayoutOpen] = useState(false);
  const referralUrl = data.profile
    ? `${APP_URL}/r/${data.profile.referralCode}`
    : null;

  return (
    <div className="space-y-4">
      <BalanceHero
        balancePaise={data.balancePaise}
        onRequestPayout={() => setPayoutOpen(true)}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          label="Lifetime"
          tone="success"
          value={formatINR(data.totals.lifetimePaise)}
          icon={<Coins size={15} />}
        />
        <Stat
          label="Pending"
          tone="warning"
          value={formatINR(data.totals.pendingPaise)}
          icon={<IndianRupee size={15} />}
        />
        <Stat
          label="Referrals"
          tone="brand"
          value={data.referrals}
          icon={<Users size={15} />}
        />
      </div>

      {referralUrl && <ReferralLinkCard url={referralUrl} />}

      {/* Recent earnings */}
      {data.recentRewards.length === 0 ? (
        <Card padded>
          <EmptyState
            title="Share your link to start earning"
            description="When someone joins the Bootcamp through your link, your reward shows up here."
            action={
              referralUrl ? (
                <CopyButton value={referralUrl} label="Copy your link" />
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card padded>
          <div className="flex items-center justify-between">
            <span className="section-label">Recent earnings</span>
            <Link
              href="/creatordashboard/rewards"
              className="inline-flex items-center gap-1 text-body-sm font-medium text-brand-500 hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-1 divide-y divide-neutral-100">
            {data.recentRewards.map((reward) => (
              <RewardRow key={reward.id} reward={reward} />
            ))}
          </div>
        </Card>
      )}

      <PayoutModal
        open={payoutOpen}
        onClose={() => setPayoutOpen(false)}
        balancePaise={data.balancePaise}
        paymentDetails={data.profile?.paymentDetails}
        onSuccess={onChange}
      />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton shape="block" height={150} className="rounded-lg" />
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Skeleton shape="block" height={84} className="rounded-lg" />
        <Skeleton shape="block" height={84} className="rounded-lg" />
        <Skeleton shape="block" height={84} className="rounded-lg" />
      </div>
      <Skeleton shape="block" height={108} className="rounded-lg" />
      <Skeleton shape="block" height={180} className="rounded-lg" />
    </div>
  );
}
