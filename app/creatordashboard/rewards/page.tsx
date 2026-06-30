"use client";

import { Card, EmptyState, SectionLabel, Skeleton } from "@/components/ui";
import { Coins } from "lucide-react";
import { useApi, PageState } from "../_components/useApi";
import { CopyButton } from "../_components/CopyButton";
import { RewardRow } from "../_components/RewardRow";
import type { CampaignsResponse, RewardsResponse } from "../_lib/api";

export default function RewardsPage() {
  const rewardsQuery = useApi<RewardsResponse>("/api/creator/rewards?limit=200");
  // The referral URL backs the zero-earnings empty state's copy button.
  const linkQuery = useApi<CampaignsResponse>("/api/creator/campaigns");

  return (
    <div className="space-y-4 py-4">
      <div>
        <SectionLabel icon={<Coins size={13} />} tone="brand">
          Earnings
        </SectionLabel>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900">
          Your rewards
        </h1>
      </div>

      <PageState query={rewardsQuery} skeleton={<ListSkeleton />}>
        {(data) =>
          data.rewards.length === 0 ? (
            <Card padded>
              <EmptyState
                title="Share your link to start earning"
                description="Every Bootcamp signup through your link becomes a reward here — pending, then approved."
                action={
                  linkQuery.data ? (
                    <CopyButton
                      value={linkQuery.data.referralUrl}
                      label="Copy your link"
                    />
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <Card padded>
              <p className="mb-1 text-body-xs text-neutral-500">
                {data.rewards.length}{" "}
                {data.rewards.length === 1 ? "reward" : "rewards"}, newest first
              </p>
              <div className="divide-y divide-neutral-100">
                {data.rewards.map((reward) => (
                  <RewardRow key={reward.id} reward={reward} />
                ))}
              </div>
            </Card>
          )
        }
      </PageState>
    </div>
  );
}

function ListSkeleton() {
  return (
    <Card padded>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton shape="text" width={90} />
              <Skeleton shape="text" width={70} />
            </div>
            <Skeleton shape="block" height={22} width={84} className="rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}
