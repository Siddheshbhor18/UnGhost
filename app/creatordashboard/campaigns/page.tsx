"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import {
  Button,
  Card,
  Field,
  Input,
  SectionLabel,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useApi, PageState } from "../_components/useApi";
import { CopyButton } from "../_components/CopyButton";
import { ReferralLinkCard } from "../_components/ReferralLinkCard";
import type { CampaignsResponse } from "../_lib/api";

/** Lowercase, hyphenate, strip anything the server's `[a-z0-9-]` rule rejects. */
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default function CampaignsPage() {
  const query = useApi<CampaignsResponse>("/api/creator/campaigns");

  return (
    <div className="space-y-4 py-4">
      <div>
        <SectionLabel icon={<Megaphone size={13} />} tone="brand">
          Campaigns
        </SectionLabel>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-neutral-900">
          Track where signups come from
        </h1>
      </div>

      <PageState query={query} skeleton={<CampaignsSkeleton />}>
        {(data) => (
          <div className="space-y-4">
            <ReferralLinkCard url={data.referralUrl} />
            <CampaignBuilder referralUrl={data.referralUrl} />
            <ExistingCampaigns
              referralUrl={data.referralUrl}
              campaigns={data.campaigns}
            />
          </div>
        )}
      </PageState>
    </div>
  );
}

function CampaignBuilder({ referralUrl }: { referralUrl: string }) {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = slugify(name);
  const preview = slug ? `${referralUrl}?campaign=${slug}` : referralUrl;

  async function copyCampaign() {
    if (!slug) return;
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/creator/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: slug }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setError("Couldn't build that link. Use letters, numbers and hyphens.");
        return;
      }
      await navigator.clipboard.writeText(body.url);
      push({
        tone: "success",
        title: "Campaign link copied",
        description: body.url,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <Card padded>
      <SectionLabel>New campaign link</SectionLabel>
      <p className="mt-1 mb-3 text-body-sm text-neutral-500">
        Name a campaign (e.g. an Instagram drop) to see its clicks and signups
        separately.
      </p>
      <Field
        label="Campaign name"
        hint="Letters, numbers and hyphens. Spaces become hyphens."
        errorMessage={error ?? undefined}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="summer-drop"
          error={Boolean(error)}
        />
      </Field>

      <div className="mt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Preview
        </span>
        <code className="mt-1 block truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-mono text-body-sm text-neutral-700">
          {preview}
        </code>
      </div>

      <Button
        className="mt-3"
        onClick={copyCampaign}
        disabled={!slug}
        loading={building}
      >
        Copy campaign link
      </Button>
    </Card>
  );
}

function ExistingCampaigns({
  referralUrl,
  campaigns,
}: {
  referralUrl: string;
  campaigns: string[];
}) {
  return (
    <Card padded>
      <SectionLabel>Your campaigns</SectionLabel>
      {campaigns.length === 0 ? (
        <p className="mt-2 text-body-sm text-neutral-500">
          No campaign traffic yet. Share a campaign link above and it'll appear
          here once it gets its first click.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {campaigns.map((campaign) => {
            const url = `${referralUrl}?campaign=${campaign}`;
            return (
              <li
                key={campaign}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-display font-semibold text-neutral-900">
                    {campaign}
                  </p>
                  <p className="truncate font-mono text-body-xs text-neutral-500">
                    {url}
                  </p>
                </div>
                <CopyButton
                  value={url}
                  size="sm"
                  iconOnly
                  className="shrink-0"
                />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton shape="block" height={112} className="rounded-lg" />
      <Skeleton shape="block" height={210} className="rounded-lg" />
      <Skeleton shape="block" height={120} className="rounded-lg" />
    </div>
  );
}
