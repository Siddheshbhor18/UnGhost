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
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function CampaignsAdminPage() {
  const campaigns = await listCampaigns();
  // Newest first — matches admin's mental model of "what did I just create".
  campaigns.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <AdminPageHeader
        badge="Campaigns"
        title="Banners & campaigns"
        subtitle="Push announcements to the landing, dashboard, or bootcamp surfaces. Saves persist immediately; there is no preview or staging step."
      />
      <CampaignsClient initial={campaigns} />
    </div>
  );
}
