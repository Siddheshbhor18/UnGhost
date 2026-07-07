import { Check, AlertTriangle, ExternalLink } from "lucide-react";
import { listIntegrations } from "@/server/integrations/status";
import { GlassCard } from "@/components/glass";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

// The admin layout provides the sidebar shell and the auth gate; this page
// used to render its own BlobField + GlassNavbar on top of it (double
// chrome, double session check) — it predates the shared layout.
export default async function AdminIntegrationsPage() {
  const integrations = listIntegrations();
  const live = integrations.filter((i) => i.mode === "live").length;
  const total = integrations.length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <AdminPageHeader
          badge="System"
          title="Integration status"
          subtitle={
            <>
              {live} of {total} services live ·{" "}
              {total - live > 0 && (
                <>
                  <span className="text-amber-700 font-semibold">
                    {total - live} mock
                  </span>{" "}
                  ·{" "}
                </>
              )}
              Add env keys in{" "}
              <code className="text-brand-primary">.env.local</code> and
              restart to swap.
            </>
          }
        />
      </div>

        {total - live > 0 && (
          <GlassCard className="!p-4 mb-5 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className="text-amber-700 mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm text-amber-900 font-semibold">
                  {total - live} integration{total - live === 1 ? "" : "s"} running in demo / mock mode.
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  The app is fully usable — every flow returns deterministic mock
                  data. Add the listed env vars to swap in real providers.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          {integrations.map((i) => (
            <GlassCard
              key={i.id}
              className={`!p-5 ${
                i.mode === "live"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                    {i.provider}
                  </p>
                  <p className="font-display font-bold text-brand-ink mt-0.5">
                    {i.label}
                  </p>
                </div>
                {i.mode === "live" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider">
                    <Check size={10} /> Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider">
                    Mock
                  </span>
                )}
              </div>

              <p className="text-xs text-brand-muted leading-relaxed mb-3">
                {i.hint}
              </p>

              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1.5">
                Required env keys
              </p>
              <div className="flex flex-wrap gap-1.5">
                {i.envKeys.map((k) => (
                  <code
                    key={k}
                    className="px-2 py-0.5 rounded-md bg-brand-ink/5 text-brand-primary text-[11px] font-mono"
                  >
                    {k}
                  </code>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="!p-5 mt-6">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
            How the swap works
          </p>
          <ol className="space-y-2 text-sm text-brand-ink/85 leading-relaxed">
            <li>
              <span className="text-brand-primary font-semibold">1.</span> Add the
              required env vars to{" "}
              <code className="text-brand-primary">.env.local</code> (dev) or your
              hosting provider (prod).
            </li>
            <li>
              <span className="text-brand-primary font-semibold">2.</span> Restart
              the Next.js process. Each adapter checks{" "}
              <code className="text-brand-primary">process.env</code> on import
              and routes to the live provider automatically — no code edits.
            </li>
            <li>
              <span className="text-brand-primary font-semibold">3.</span> Return
              to this page to confirm every row reads{" "}
              <span className="text-emerald-700 font-semibold">Live</span>.
            </li>
          </ol>
          <a
            href="https://docs.unghost.com/integrations"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-brand-primary hover:underline"
          >
            <ExternalLink size={11} /> Full setup guides
          </a>
        </GlassCard>
    </div>
  );
}
