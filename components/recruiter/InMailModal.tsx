"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";

interface Props {
  candidate: {
    candidateId: string;
    publicName: string | null;
    headline: string;
    skills: string[];
    isAnonymous: boolean;
  };
  jobId?: string;
  jobTitle?: string;
  creditsRemaining: number;
  onClose: () => void;
  onSent: (creditsRemaining: number) => void;
}

type Phase = "compose" | "sending" | "sent" | "error";

export function InMailModal({
  candidate,
  jobId,
  jobTitle,
  creditsRemaining,
  onClose,
  onSent,
}: Props) {
  const [phase, setPhase] = useState<Phase>("compose");
  const [subject, setSubject] = useState(
    jobTitle ? `Quick chat about ${jobTitle}?` : "Quick chat?",
  );
  const topSkills = candidate.skills.slice(0, 2).filter(Boolean);
  const [body, setBody] = useState(
    `Hi${candidate.publicName ? " " + candidate.publicName.split(" ")[0] : ""},\n\nYour profile lines up well with what we're hiring for${
      jobTitle ? ` (${jobTitle})` : ""
    }.${topSkills.length ? ` Strong on ${topSkills.join(" + ")}.` : ""}\n\nOpen to a 15-min intro chat this week?\n\n— `,
  );
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setPhase("sending");
    try {
      const res = await fetch("/api/recruiter/inmail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId: candidate.candidateId,
          jobId,
          subject,
          body,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Couldn't send.");
        setPhase("error");
        return;
      }
      await new Promise((r) => setTimeout(r, 600));
      setPhase("sent");
      setTimeout(() => onSent(data.creditsRemaining), 1200);
    } catch {
      setError("Network error.");
      setPhase("error");
    }
  }

  function aiDraft() {
    // Phase 1: client-side template fill. Real impl calls Claude.
    const opener = topSkills.length
      ? `I noticed your work on ${topSkills.join(" and ")} — exactly the depth we're looking for${jobTitle ? ` for our ${jobTitle} role` : ""}.`
      : `Your background looks like a strong fit${jobTitle ? ` for our ${jobTitle} role` : ""}.`;
    setBody(
      `Hi${candidate.publicName ? " " + candidate.publicName.split(" ")[0] : ""},\n\n${opener}\n\nWe're SLA-bound — if you reply, I'll respond within 24 hours, guaranteed. No black holes.\n\nWould a 15-minute intro chat this week make sense? Happy to share more about the role + comp upfront.\n\nLooking forward,\n— `,
    );
  }

  const canSend =
    subject.trim().length > 5 &&
    body.trim().length > 40 &&
    phase === "compose";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <GlassCard
        variant="strong"
        className="relative !p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
              InMail outreach · costs 1 credit
            </p>
            <h2 className="font-display font-bold text-xl text-brand-ink mt-1">
              To: {candidate.publicName ?? "Anonymous candidate"}
            </h2>
            <p className="text-xs text-brand-muted mt-1">
              {candidate.headline} ·{" "}
              <span className="text-brand-ink font-semibold">
                {creditsRemaining}
              </span>{" "}
              credit{creditsRemaining === 1 ? "" : "s"} left
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-brand-muted hover:text-rose-600"
          >
            <X size={18} />
          </button>
        </div>

        {phase === "compose" && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-2">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white/60 border border-brand-ink/10 rounded-xl px-3 py-2.5 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                placeholder="Quick chat about [role]?"
                maxLength={120}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                  Message
                </label>
                <button
                  onClick={aiDraft}
                  className="text-[11px] font-semibold text-brand-primary hover:underline inline-flex items-center gap-1"
                >
                  <Sparkles size={11} /> Help me draft
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                className="w-full bg-white/60 border border-brand-ink/10 rounded-xl px-3 py-2.5 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary leading-relaxed"
              />
              <p className="text-[10px] text-brand-muted mt-1.5">
                {body.split(/\s+/).filter(Boolean).length} words · candidate
                has 14 days to respond before credit auto-refunds
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-brand-ink/5">
              <GlassButton variant="glass" onClick={onClose}>
                Cancel
              </GlassButton>
              <GlassButton
                variant="brand"
                disabled={!canSend}
                onClick={send}
              >
                <Send size={12} /> Send InMail (1 credit)
              </GlassButton>
            </div>
          </div>
        )}

        {phase === "sending" && (
          <div className="text-center py-10">
            <Loader2
              size={28}
              className="mx-auto text-brand-primary animate-spin mb-3"
            />
            <p className="text-sm text-brand-muted">Sending InMail…</p>
          </div>
        )}

        {phase === "sent" && (
          <div className="text-center py-8">
            <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-glass-lg mb-3">
              <CheckCircle2 size={28} />
            </div>
            <p className="font-display font-bold text-xl text-brand-ink">
              InMail sent ✓
            </p>
            <p className="text-sm text-brand-muted mt-2">
              {creditsRemaining - 1} credit{creditsRemaining - 1 === 1 ? "" : "s"}{" "}
              remaining · candidate notified
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center py-8">
            <X size={28} className="mx-auto text-rose-600 mb-2" />
            <p className="font-display font-semibold text-rose-700">
              Couldn&apos;t send
            </p>
            <p className="text-xs text-brand-muted mt-1 max-w-sm mx-auto">
              {error}
            </p>
            <GlassButton
              variant="glass"
              className="mt-4"
              onClick={onClose}
            >
              Close
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
