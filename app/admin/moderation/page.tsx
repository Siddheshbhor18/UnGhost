import {
  AlertTriangle,
  Briefcase,
  FileText,
  Flag,
  MessageCircle,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import {
  createModerationFlag,
  listModerationFlags,
} from "@/server/store";
import { ModerationActionCard } from "@/components/admin/ModerationActionCard";

// Phase 1: seed a few example flags on first visit so the queue isn't empty.
// Real impl: flags arrive via Inngest jobs from AI moderation pre-check.
async function seedIfEmpty() {
  const existing = await listModerationFlags({ limit: 1 });
  if (existing.length > 0) return;
  await Promise.all([
    createModerationFlag({
      kind: "job_posting",
      targetId: "job_demo_1",
      targetLabel: "Senior Engineer · Vague Co.",
      contentExcerpt:
        "Looking for rockstar 10x ninjas who can work 12-hour days and rapidly grind. Salary based on passion.",
      aiConfidence: 78,
      reasons: ["unrealistic_expectations", "non_specific_role", "salary_disclosed_as_passion"],
      reportedBy: "ai_moderation",
    }),
    createModerationFlag({
      kind: "user_message",
      targetId: "msg_demo_1",
      targetLabel: "Recruiter → Anonymous candidate",
      contentExcerpt:
        "How old are you? Are you married? We prefer younger candidates with no family commitments.",
      aiConfidence: 96,
      reasons: ["age_discrimination", "marital_status_inquiry"],
      reportedBy: "ai_moderation",
    }),
    createModerationFlag({
      kind: "bootcamp_assignment",
      targetId: "assn_demo_1",
      targetLabel: "Top-10 submission · LLM Grounding",
      contentExcerpt:
        "Furthermore, in conclusion, it is important to note that LLM grounding is a critical aspect of...",
      aiConfidence: 84,
      reasons: ["ai_generated_likelihood", "generic_phrasing"],
      reportedBy: "ai_detection",
    }),
  ]);
}

const KIND_ICON: Record<string, React.ReactNode> = {
  job_posting: <Briefcase size={14} />,
  user_message: <MessageCircle size={14} />,
  bootcamp_assignment: <FileText size={14} />,
  user_profile: <UserIcon size={14} />,
  review: <Flag size={14} />,
};

export default async function ModerationQueue() {
  await seedIfEmpty();
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

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="!p-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
            Pending
          </p>
          <p className="font-display text-3xl font-bold text-amber-600 mt-1">
            {pending.length}
          </p>
        </GlassCard>
        <GlassCard className="!p-4">
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
            Decided (recent)
          </p>
          <p className="font-display text-3xl font-bold text-emerald-600 mt-1">
            {recentDecided.length}
          </p>
        </GlassCard>
        <GlassCard className="!p-4">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
            AI auto-pre-filter
          </p>
          <p className="font-display text-3xl font-bold text-brand-primary mt-1">
            ~70%
          </p>
          <p className="text-[10px] text-brand-muted mt-1">
            of garbage caught before this queue
          </p>
        </GlassCard>
      </div>

      {/* Pending queue */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-lg text-brand-ink">
          Awaiting decision · {pending.length}
        </h2>
        {pending.length === 0 ? (
          <GlassCard className="text-center !py-10">
            <p className="text-sm text-brand-muted">
              Queue clear. AI pre-filter handling everything.
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
