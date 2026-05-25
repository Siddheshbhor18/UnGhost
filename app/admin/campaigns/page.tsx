/**
 * /admin/campaigns — server shell.
 *
 * Earlier this file was a pure-`useState` mock that pretended to save
 * campaigns into local memory. Now it server-fetches the real
 * CampaignModel rows and hands them to `<CampaignsClient />`, which
 * mutates via /api/admin/campaigns + /[id]. The same campaigns are read
 * by `listLiveCampaigns(placement)` at landing-page render time, so
 * publishing here now actually surfaces on the site.
 *
 * Admin gate is provided by `app/admin/layout.tsx` — no re-check needed.
 */
import { listCampaigns } from "@/server/store";
import { CampaignsClient } from "./CampaignsClient";
import { GlassBadge } from "@/components/glass";

export const dynamic = "force-dynamic";

export default async function CampaignsAdminPage() {
  const campaigns = await listCampaigns();
  // Newest first — matches admin's mental model of "what did I just create".
  campaigns.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <GlassBadge tone="brand">Campaigns</GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Banner &amp; Campaign Management
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Push announcements to the landing, dashboard, or bootcamp surfaces.
          Saves persist immediately — no preview/staging step.
        </p>
      </div>
      <CampaignsClient initial={campaigns} />
    </div>
  );
}
