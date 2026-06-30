import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Wallet, Clock, TrendingUp } from "lucide-react";
import { getCreatorById, countReferrals } from "@/server/creator/creator.service";
import {
  getActiveAgreement,
  listAgreementHistory,
} from "@/server/creator/commission.service";
import { getBalance, getLedgerHistory } from "@/server/creator/ledger.service";
import { listRewards } from "@/server/creator/reward.service";
import { getUserById } from "@/server/store";
import { Stat, Badge } from "@/components/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import {
  CREATOR_STATUS_TONE,
  formatINR,
  referralUrl,
} from "@/components/admin/creatorUi";
import {
  CreatorDetailClient,
  type CreatorDetail,
} from "@/components/admin/CreatorDetailClient";

export const dynamic = "force-dynamic";

/**
 * /admin/creators/[id] — full creator detail. Reads every relevant slice
 * directly from the services, 404s on an unknown creator, and hands the data
 * to the client component which owns all mutations.
 */
export default async function CreatorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getCreatorById(params.id);
  if (!profile) notFound();

  const [user, activeAgreement, agreementHistory, balancePaise, referrals, rewards, ledger] =
    await Promise.all([
      getUserById(params.id),
      getActiveAgreement(params.id),
      listAgreementHistory(params.id),
      getBalance(params.id),
      countReferrals(params.id),
      listRewards({ creatorId: params.id }),
      getLedgerHistory(params.id),
    ]);

  const lifetimePaise = rewards
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.calculatedAmount, 0);
  const pendingCount = rewards.filter((r) => r.status === "pending").length;

  const link = referralUrl(profile.referralCode);

  const detail: CreatorDetail = {
    creatorId: params.id,
    name: user?.name ?? "Unknown creator",
    email: user?.email ?? "",
    profile,
    activeAgreement: activeAgreement ?? null,
    agreementHistory,
    balancePaise,
    referrals,
    rewards,
    ledger,
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <Link
        href="/admin/creators"
        className="inline-flex items-center gap-1.5 text-body-sm text-brand-muted hover:text-brand-ink transition"
      >
        <ArrowLeft size={14} /> All creators
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-brand-ink">
              {detail.name}
            </h1>
            <Badge tone={CREATOR_STATUS_TONE[profile.status]} size="md">
              {profile.status}
            </Badge>
          </div>
          <p className="text-sm text-brand-muted mt-1">{detail.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="text-body-xs font-mono text-neutral-600 bg-neutral-100 rounded-lg px-2.5 py-1.5 max-w-[420px] truncate">
              {link}
            </code>
            <CopyButton value={link} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Balance"
          value={formatINR(balancePaise)}
          tone={balancePaise < 0 ? "danger" : "success"}
          icon={<Wallet size={16} />}
        />
        <Stat
          label="Lifetime earned"
          value={formatINR(lifetimePaise)}
          sub="Approved rewards"
          icon={<TrendingUp size={16} />}
          tone="brand"
        />
        <Stat
          label="Referrals"
          value={referrals}
          icon={<Users size={16} />}
          tone="neutral"
        />
        <Stat
          label="Pending rewards"
          value={pendingCount}
          icon={<Clock size={16} />}
          tone="warning"
        />
      </div>
      <CreatorDetailClient detail={detail} />
    </div>
  );
}
