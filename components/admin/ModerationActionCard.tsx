"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { ModerationFlag, ModerationDecision } from "@/shared/types";

interface Props {
  flag: ModerationFlag;
  icon: React.ReactNode;
}

type Phase = "idle" | "submitting";

export function ModerationActionCard({ flag, icon }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState<ModerationDecision | null>(null);

  async function decide(decision: ModerationDecision, withNote?: string) {
    setPhase("submitting");
    try {
      const res = await fetch(`/api/admin/moderation/${flag.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, decisionNote: withNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Decision failed");
        setPhase("idle");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error");
      setPhase("idle");
    }
  }

  const aiTone =
    flag.aiConfidence >= 80
      ? "danger"
      : flag.aiConfidence >= 60
      ? "warn"
      : "neutral";

  return (
    <GlassCard className="!p-5 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <GlassBadge tone="warn">{flag.kind.replace(/_/g, " ")}</GlassBadge>
            <GlassBadge tone={aiTone}>
              <ShieldAlert size={9} /> AI confidence {flag.aiConfidence}%
            </GlassBadge>
            <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
              flagged by {flag.reportedBy.replace("_", " ")}
            </span>
          </div>
          <p className="font-display font-semibold text-sm text-brand-ink">
            {flag.targetLabel}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/40 border border-brand-ink/5 p-3">
        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
          Excerpt
        </p>
        <p className="text-sm text-brand-ink leading-relaxed italic">
          &ldquo;{flag.contentExcerpt}&rdquo;
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {flag.reasons.map((r) => (
          <GlassBadge key={r} tone="danger">
            {r.replace(/_/g, " ")}
          </GlassBadge>
        ))}
      </div>

      {showNote && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
            Optional · note visible in audit log
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Why this decision?"
            className="w-full bg-white/60 border border-amber-500/20 rounded-xl px-3 py-2 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => {
                setShowNote(null);
                setNote("");
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="brand"
              size="sm"
              onClick={() => decide(showNote, note)}
              disabled={phase === "submitting"}
            >
              Confirm
            </GlassButton>
          </div>
        </div>
      )}

      {!showNote && phase === "idle" && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-ink/5">
          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => decide("approved")}
          >
            <CheckCircle2 size={12} /> Approve · false flag
          </GlassButton>
          <GlassButton
            variant="brand"
            size="sm"
            onClick={() => setShowNote("removed_warning")}
          >
            <AlertTriangle size={12} /> Remove + warn user
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setShowNote("removed_suspension")}
            className="!text-rose-700"
          >
            <X size={12} /> Remove + suspend
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setShowNote("escalated")}
          >
            <ShieldAlert size={12} /> Escalate to legal
          </GlassButton>
        </div>
      )}

      {phase === "submitting" && (
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <Loader2 size={14} className="animate-spin text-brand-primary" />
          Recording decision…
        </div>
      )}
    </GlassCard>
  );
}
