import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  FileText,
  Flag,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import { listModerationFlags } from "@/server/store";
import { ModerationActionCard } from "@/components/admin/ModerationActionCard";

// NOTE — auto-seeding of demo flags was removed (was: a `seedIfEmpty()` that
// silently inserted 3 fake "Vague Co." / age-discrimination / AI-detection
// rows into the real ModerationFlag collection on every render of an empty
// queue). That was acceptable as a dev fixture, but in prod it polluted the
// DB and made the queue feel "live" when it wasn't. Real flags now only
// arrive from:
//   • the auto-flag write inside admin/user moderation actions
//   • the abuse webhook receiver
//   • the future Inngest AI-moderation pipeline (parked until cohort 2).
//
// If the queue is genuinely empty, the empty state below reads as "queue
// clear" rather than auto-fabricating work for the admin.

const KIND_ICON: Record<string, React.ReactNode> = {
  job_posting: <Briefcase size={14} />,
  user_message: <MessageCircle size={14} />,
  bootcamp_assignment: <FileText size={14} />,
  user_profile: <UserIcon size={14} />,
  review: <Flag size={14} />,
};

export default async function ModerationQueue() {
  const [pending, decided] = await Promise.all([
    listModerationFlags({ decision: "pending", limit: 50 }),
    listModerationFlags({ limit: 30 }),
  ]);
  const recentDecided = decided.filter((f) => f.decision !== "pending").slice(0, 6);

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <GlassBadge tone="warn">
          <ShieldAlert size={11} /> Content moderation
        </GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Flagged content queue
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          AI pre-filters obvious violations · admin makes the call. Every
          decision audit-logged. Misuse triggers an account-action.
        </p>
      </div>

      {/* Stats strip — only counts what's actually in the DB. The earlier
          "~70% AI pre-filter" tile was a static literal; removed until
          there's a real moderation pipeline emitting metrics we can show. */}
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <GlassCard className="!p-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
            Pending
          </p>
          <p className="font-display text-3xl font-bold text-amber-600 mt-1 tnum">
            {pending.length}
          </p>
        </GlassCard>
        <GlassCard className="!p-4">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
            Decided (recent)
          </p>
          <p className="font-display text-3xl font-bold text-emerald-600 mt-1 tnum">
            {recentDecided.length}
          </p>
        </GlassCard>
      </div>

      {/* Pending queue */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-lg text-brand-ink">
          Awaiting decision · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <GlassCard className="text-center !py-12">
            <div className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 mb-3">
              <CheckCircle2 size={26} />
            </div>
            <p className="font-display font-bold text-brand-ink">All clear</p>
            <p className="text-sm text-brand-muted mt-1.5 max-w-md mx-auto leading-relaxed">
              No flags awaiting review. New flags arrive when admins flag
              users / jobs / messages, or when the abuse-detection pipeline
              writes one.
            </p>
            <p className="text-[11px] text-brand-muted/80 mt-4 inline-flex items-center gap-1">
              <Sparkles size={11} /> Auto AI pre-filter is a Phase-2 item
            </p>
          </GlassCard>
        ) : (
          pending.map((f) => (
            <ModerationActionCard
              key={f.id}
              flag={f}
              icon={KIND_ICON[f.kind] ?? <AlertTriangle size={14} />}
            />
          ))
        )}
      </div>

      {/* Recent decisions */}
      {recentDecided.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-lg text-brand-ink">
            Recent decisions
          </h2>
          {recentDecided.map((f) => (
            <GlassCard key={f.id} className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <GlassBadge tone="neutral">{f.kind}</GlassBadge>
                    <GlassBadge
                      tone={
                        f.decision === "approved"
                          ? "success"
                          : f.decision === "escalated"
                          ? "warn"
                          : "danger"
                      }
                    >
                      {f.decision.replace(/_/g, " ")}
                    </GlassBadge>
                  </div>
                  <p className="text-sm font-display font-semibold text-brand-ink">
                    {f.targetLabel}
                  </p>
                  <p className="text-xs text-brand-muted line-clamp-1 mt-0.5">
                    {f.contentExcerpt}
                  </p>
                  {f.decisionNote && (
                    <p className="text-xs text-brand-ink/70 mt-1.5 italic">
                      &ldquo;{f.decisionNote}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
