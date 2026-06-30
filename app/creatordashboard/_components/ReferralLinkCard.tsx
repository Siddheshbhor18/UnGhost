"use client";

import { Link2 } from "lucide-react";
import { Card, SectionLabel } from "@/components/ui";
import { CopyButton } from "./CopyButton";

/** The creator's permanent referral link with a one-tap copy. Appears on Home,
 *  Campaigns and Settings — every signup through it is theirs forever. */
export function ReferralLinkCard({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <SectionLabel icon={<Link2 size={13} />} tone="brand">
        Your referral link
      </SectionLabel>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 min-w-0 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 font-mono text-body-sm text-neutral-700">
          {url}
        </code>
        <CopyButton value={url} label="Copy link" className="shrink-0" />
      </div>
      <p className="mt-2 text-body-xs text-neutral-500">
        Share it anywhere. Every signup through this link is permanently yours.
      </p>
    </Card>
  );
}
