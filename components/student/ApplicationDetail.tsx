"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Ghost,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
} from "@/components/glass";
import { MessageThread } from "@/components/shared/MessageThread";
import type {
  Application,
  CompanyProfile,
  Job,
  Stage,
} from "@/shared/types";

const PIPELINE: Array<{ key: Stage; label: string }> = [
  { key: "new_matches", label: "Awaiting review" },
  { key: "under_review", label: "Under review" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer extended" },
  { key: "hired", label: "Hired" },
];

interface Props {
  application: Application;
  job: Job;
  company: CompanyProfile | null;
  /** Whether the recruiter has personally identified themselves to the student
   *  (PRD: gated until past Stage 1). */
  recruiterRevealed: boolean;
}

export function ApplicationDetail({
  application: initial,
  job,
  company,
  recruiterRevealed,
}: Props) {
  const router = useRouter();
  const [app, setApp] = useState<Application>(initial);
  const [busy, setBusy] = useState<"withdraw" | "update" | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── SLA live countdown ────────────────────────────────────────
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const slaDiff = new Date(app.slaDeadline).getTime() - now;
  const slaExpired = slaDiff <= 0;
  const slaPulse = !slaExpired && slaDiff < 4 * 3600_000;
  const slaLabel = useMemo(() => {
    const abs = Math.abs(slaDiff);
    const h = Math.floor(abs / 3600_000);
    const m = Math.floor((abs % 3600_000) / 60_000);
    const s = Math.floor((abs % 60_000) / 1000);
    if (slaExpired) return `Breached ${h}h ${m}m ago`;
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [slaDiff, slaExpired]);

  const stageIdx = PIPELINE.findIndex((p) => p.key === app.stage);
  const isTerminal = app.stage === "hired" || app.stage === "rejected";
  const advancedPastStage1 = stageIdx >= 1;
  const messagingUnlocked = advancedPastStage1 && !isTerminal;
  const slaBreachActive = slaExpired && !isTerminal;

  // ── Actions ──────────────────────────────────────────────────
  async function withdraw() {
    setBusy("withdraw");
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      const data: Application & { error?: string } = await res.json();
      if (data.error) {
        setToast(`Couldn't withdraw — ${data.error}`);
      } else {
        setApp(data);
        setConfirmWithdraw(false);
        setToast("Application withdrawn. Slot is yours to use elsewhere.");
        setTimeout(() => router.push("/student/applications"), 1400);
      }
    } finally {
      setBusy(null);
    }
  }

  async function requestUpdate() {
    setBusy("update");
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request_update" }),
      });
      const data: Application & { error?: string } = await res.json();
      if (data.error) {
        setToast(`${data.error}`);
      } else {
        setApp(data);
        setToast("Recruiter pinged. You can do this once per application.");
      }
    } finally {
      setBusy(null);
    }
  }

  // Unsubmitted (failed) attempt — private to the student, retryable. The SLA
  // countdown, pipeline, and messaging below only apply to submitted
  // applications, so show a focused "didn't pass / retry" view instead.
  if (app.submitted === false) {
    const g = app.assessment?.grade;
    return (
      <div className="space-y-5">
        <Link
          href="/student/applications"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold"
        >
          <ArrowLeft size={14} /> All applications
        </Link>
        <GlassCard className="!p-6">
          <GlassBadge tone="warn">Didn&apos;t pass yet</GlassBadge>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
            {job.title}
          </h1>
          <p className="text-sm text-brand-muted mt-1 leading-relaxed">
            This attempt scored{" "}
            <span className="font-semibold text-brand-ink">
              {g?.score ?? "—"}/100
            </span>
            . It was <span className="font-semibold">not sent to the recruiter</span>{" "}
            and doesn&apos;t use an application slot — retry whenever you&apos;re
            ready.
          </p>
          {g?.notes && (
            <p className="text-sm text-brand-ink/85 mt-3 leading-relaxed">
              {g.notes}
            </p>
          )}
          <Link
            href={`/missions/${job.id}/assess`}
            className="btn-brand mt-5 inline-flex"
          >
            <RefreshCw size={14} /> Retry assessment →
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/student/applications"
        className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold"
      >
        <ArrowLeft size={14} /> All applications
      </Link>

      {/* ── SLA Breach Banner ──────────────────────────────────── */}
      {slaBreachActive && (
        <GlassCard className="bg-rose-500/5 border-rose-500/30 !p-5">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-rose-500 text-white shrink-0">
              <Ghost size={18} />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-lg text-rose-700">
                Recruiter ghosted · SLA breached
              </p>
              <p className="text-sm text-rose-800 mt-1 leading-relaxed">
                Your application credit has been refunded.{" "}
                <span className="font-semibold">
                  {company?.name ?? "The company"}
                </span>{" "}
                missed their {job.slaHours}-hour SLA. AI Coach has 3 similar
                missions queued for you on the dashboard.
              </p>
              <div className="flex gap-2 mt-3">
                <Link href="/dashboard" className="btn-glass !text-rose-700">
                  See similar missions →
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <GlassCard variant="strong" className="!p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GlassBadge tone="neutral">{company?.name}</GlassBadge>
              <GlassBadge
                tone={
                  app.stage === "hired"
                    ? "success"
                    : app.stage === "rejected"
                    ? "danger"
                    : "brand"
                }
              >
                {labelForStage(app.stage, app.withdrawnAt)}
              </GlassBadge>
              {app.updateRequestedAt && (
                <GlassBadge tone="warn">
                  <RefreshCw size={10} /> Update requested
                </GlassBadge>
              )}
            </div>
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-brand-ink">
              {job.title}
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Applied{" "}
              {new Date(app.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" · "}
              Match{" "}
              <span className="text-brand-ink font-semibold">
                {app.matchPct}%
              </span>
            </p>
          </div>

          {/* SLA live clock */}
          {!isTerminal && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                SLA
              </p>
              <p
                className={`font-display font-extrabold text-2xl font-mono flex items-center gap-1 ${
                  slaExpired
                    ? "text-rose-600"
                    : slaPulse
                    ? "text-amber-600 animate-pulse"
                    : "text-brand-ink"
                }`}
              >
                <Clock size={18} /> {slaLabel}
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── Pipeline Timeline ──────────────────────────────────── */}
      <GlassCard>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
          Your journey
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PIPELINE.map((stage, i) => {
            const reached = stageIdx >= i;
            const current = stageIdx === i;
            return (
              <div
                key={stage.key}
                className="flex items-center gap-2 shrink-0"
              >
                <div
                  className={`px-3.5 py-2.5 rounded-xl ${
                    current
                      ? "bg-brand-primary text-white shadow-brand-glow"
                      : reached
                      ? "bg-brand-primary/15 text-brand-primary"
                      : "bg-white/60 border border-brand-ink/10 text-brand-muted"
                  }`}
                >
                  <p className="text-xs font-semibold">{stage.label}</p>
                  <p
                    className={`text-[10px] ${
                      current
                        ? "text-white/80"
                        : reached
                        ? "text-brand-primary/70"
                        : "text-brand-muted/80"
                    }`}
                  >
                    {job.slaHours}h SLA
                  </p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div
                    className={`h-px w-6 ${
                      reached ? "bg-brand-primary/40" : "bg-brand-ink/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {app.interviewScheduledAt && (
          <p className="text-xs text-brand-muted mt-4 pt-3 border-t border-brand-ink/5">
            <CheckCircle2
              size={12}
              className="inline text-emerald-600 mr-1.5"
            />
            Interview scheduled for{" "}
            <span className="text-brand-ink font-semibold">
              {new Date(app.interviewScheduledAt).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
        )}
      </GlassCard>

      {/* ── AI Grading Notes (visible once graded) ─────────────── */}
      {app.assessment?.grade && (
        <GlassCard className="bg-gradient-to-br from-brand-primary/5 via-white/60 to-white/40">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles size={12} /> AI grading notes
          </p>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                Score
              </p>
              <p
                className={`font-display font-extrabold text-3xl ${
                  app.assessment.grade.score >= 75
                    ? "text-emerald-600"
                    : app.assessment.grade.score >= 55
                    ? "text-brand-primary"
                    : "text-rose-600"
                }`}
              >
                {app.assessment.grade.score}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-brand-ink leading-relaxed">
                {app.assessment.grade.notes}
              </p>
              {app.assessment.integrityScore !== undefined && (
                <p className="text-[11px] text-brand-muted mt-2">
                  Integrity score:{" "}
                  <span
                    className={
                      app.assessment.integrityScore >= 80
                        ? "text-emerald-700 font-semibold"
                        : "text-amber-700 font-semibold"
                    }
                  >
                    {app.assessment.integrityScore}/100
                  </span>
                </p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── Messages thread (gated past Stage 1) ───────────────── */}
      {messagingUnlocked ? (
        <MessageThread applicationId={app.id} />
      ) : (
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <MessageCircle size={12} /> Messages
          </p>
          <div className="text-center py-6">
            <MessageCircle
              size={20}
              className="mx-auto text-brand-muted mb-2"
            />
            <p className="text-sm text-brand-muted">
              Messaging unlocks once the recruiter advances you past Stage 1.
            </p>
          </div>
        </GlassCard>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <GlassCard className="!p-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-display font-semibold text-brand-ink">
              Need a nudge?
            </p>
            <p className="text-xs text-brand-muted">
              One pre-formatted ping per application. Use it wisely.
            </p>
          </div>
          <div className="flex gap-2">
            <GlassButton
              variant="glass"
              size="md"
              onClick={requestUpdate}
              disabled={
                busy === "update" ||
                !!app.updateRequestedAt ||
                isTerminal ||
                slaBreachActive
              }
            >
              <RefreshCw size={12} />{" "}
              {app.updateRequestedAt
                ? "Update requested"
                : busy === "update"
                ? "Sending…"
                : "Request update"}
            </GlassButton>
            {!isTerminal && (
              <GlassButton
                variant="glass"
                size="md"
                onClick={() => setConfirmWithdraw(true)}
              >
                <XCircle size={12} /> Withdraw
              </GlassButton>
            )}
            <Link href={`/missions/${job.id}`} className="btn-glass">
              <Target size={12} /> View mission
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* ── Hire / Reject terminal states ──────────────────────── */}
      {app.stage === "hired" && (
        <GlassCard className="bg-emerald-500/5 border-emerald-500/20 text-center">
          <Award size={24} className="mx-auto text-emerald-600 mb-2" />
          <p className="font-display font-bold text-emerald-700">
            🎉 You got the role.
          </p>
          <p className="text-sm text-brand-muted mt-1">
            Welcome aboard {company?.name}. Final paperwork lands in your inbox.
          </p>
        </GlassCard>
      )}
      {app.stage === "rejected" && (
        <GlassCard className="!p-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
            Outcome
          </p>
          <p className="text-sm text-brand-ink/90 leading-relaxed">
            {app.outcomeNotes ??
              "Closed without advancing. AI Coach can help you tune your next submission."}
          </p>
          {app.withdrawnAt && (
            <p className="text-xs text-brand-muted mt-3">
              You withdrew on{" "}
              {new Date(app.withdrawnAt).toLocaleDateString("en-IN")}
            </p>
          )}
        </GlassCard>
      )}

      {/* ── Withdraw confirm modal ─────────────────────────────── */}
      {confirmWithdraw && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            onClick={() => setConfirmWithdraw(false)}
          />
          <GlassCard
            variant="strong"
            className="relative !p-6 w-full max-w-md"
          >
            <AlertTriangle
              size={24}
              className="text-amber-600 mb-3"
            />
            <p className="font-display font-bold text-lg text-brand-ink">
              Withdraw from this mission?
            </p>
            <p className="text-sm text-brand-muted mt-2 leading-relaxed">
              Your application moves to rejected. This{" "}
              <span className="text-rose-700 font-semibold">does not</span>{" "}
              refund your application slot — only an SLA breach does.
            </p>
            <div className="mt-5 flex gap-2">
              <GlassButton
                variant="glass"
                fullWidth
                onClick={() => setConfirmWithdraw(false)}
              >
                Keep going
              </GlassButton>
              <GlassButton
                variant="brand"
                fullWidth
                onClick={withdraw}
                disabled={busy === "withdraw"}
              >
                {busy === "withdraw" ? "Withdrawing…" : "Yes, withdraw"}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-4 inset-x-4 z-40 md:inset-x-auto md:right-6 md:max-w-sm">
          <div className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-glass-lg p-4 flex items-start gap-2">
            <CheckCircle2
              size={16}
              className="text-emerald-600 mt-0.5 shrink-0"
            />
            <p className="text-sm text-brand-ink flex-1">{toast}</p>
            <button
              onClick={() => setToast(null)}
              className="text-brand-muted hover:text-brand-ink"
            >
              <XCircle size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function labelForStage(stage: Stage, withdrawnAt?: string): string {
  if (withdrawnAt) return "Withdrawn";
  switch (stage) {
    case "new_matches":
      return "Awaiting Review";
    case "under_review":
      return "Under Review";
    case "interview":
      return "Interview Scheduled";
    case "offer":
      return "Offer Extended";
    case "hired":
      return "Hired";
    case "rejected":
      return "Rejected";
  }
}
