"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Sparkles,
  Star,
  Users as UsersIcon,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { Bootcamp } from "@/shared/types";

interface Props {
  bootcamp: Bootcamp;
  instructorName: string;
}

type Phase = "idle" | "approving" | "rejecting" | "feedback" | "done";

const CATEGORY_LABEL: Record<string, string> = {
  ai: "AI / GenAI",
  data_science: "Data Science",
  marketing: "Marketing",
  finance: "Finance",
  sales: "Sales / BD",
};

export function BootcampReviewCard({ bootcamp, instructorName }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [feedback, setFeedback] = useState("");

  async function decide(
    decision: "approve" | "request_changes" | "archive",
    reviewFeedback?: string,
  ) {
    setPhase(decision === "approve" ? "approving" : "rejecting");
    try {
      const res = await fetch(
        `/api/admin/bootcamps/${bootcamp.id}/decision`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision, reviewFeedback }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Decision failed");
        setPhase("idle");
        return;
      }
      setPhase("done");
      setTimeout(() => router.refresh(), 800);
    } catch {
      alert("Network error");
      setPhase("idle");
    }
  }

  return (
    <GlassCard className="!p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <GlassBadge tone="warn">
              <Clock size={10} /> In review
            </GlassBadge>
            <GlassBadge tone="brand">
              {CATEGORY_LABEL[bootcamp.category] ?? bootcamp.skill}
            </GlassBadge>
            <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
              by {instructorName}
            </span>
          </div>
          <h3 className="font-display font-bold text-lg text-brand-ink">
            {bootcamp.title}
          </h3>
          <p className="text-sm text-brand-muted mt-1 line-clamp-2 leading-relaxed">
            {bootcamp.description}
          </p>
        </div>
        <Link
          href={`/bootcamp/${bootcamp.id}`}
          className="btn-glass shrink-0"
        >
          <Eye size={12} /> Preview
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-brand-ink/5">
        <Stat
          icon={<VideoIcon size={11} />}
          label="Videos"
          value={bootcamp.videos.length}
        />
        <Stat
          icon={<Clock size={11} />}
          label="Live slots"
          value={bootcamp.liveSlots.length}
        />
        <Stat
          icon={<UsersIcon size={11} />}
          label="Duration"
          value={`${bootcamp.durationWeeks}w`}
        />
        <Stat
          icon={<Sparkles size={11} />}
          label="Price"
          value={`₹${bootcamp.priceINR.toLocaleString("en-IN")}`}
        />
      </div>

      {phase === "feedback" && (
        <div className="rounded-2xl bg-rose-500/5 border border-rose-500/20 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1.5">
            <AlertTriangle size={11} /> Request changes
          </p>
          <p className="text-xs text-brand-muted">
            Be specific. The instructor sees this verbatim in the editor.
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="e.g. Module 2 video 3 has audio sync issues at 04:30. The skill-check rubric for Module 1 needs to test trade-off awareness, not just recall."
            className="w-full bg-white/60 border border-rose-500/20 rounded-xl px-3 py-2 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
          <p
            className={`text-[11px] ${
              feedback.length >= 20 ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {feedback.length} / 20 min chars
          </p>
          <div className="flex justify-end gap-2">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => {
                setPhase("idle");
                setFeedback("");
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="brand"
              size="sm"
              onClick={() => decide("request_changes", feedback)}
              disabled={feedback.length < 20}
            >
              Send to instructor
            </GlassButton>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <p className="text-sm text-emerald-800 font-semibold">
            Decision recorded · instructor notified.
          </p>
        </div>
      )}

      {phase === "idle" && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-ink/5">
          <GlassButton
            variant="brand"
            size="sm"
            onClick={() => decide("approve")}
          >
            <CheckCircle2 size={12} /> Approve &amp; publish
          </GlassButton>
          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setPhase("feedback")}
          >
            <AlertTriangle size={12} /> Request changes
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  "Archive this bootcamp? Instructor can request restore.",
                )
              ) {
                decide("archive");
              }
            }}
          >
            <X size={12} /> Archive
          </GlassButton>
        </div>
      )}

      {(phase === "approving" || phase === "rejecting") && (
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <Loader2 size={14} className="animate-spin text-brand-primary" />
          Submitting decision…
        </div>
      )}
    </GlassCard>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white/40 rounded-xl border border-brand-ink/5 p-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-brand-muted font-semibold">
        {icon}
        {label}
      </p>
      <p className="font-display text-base font-bold text-brand-ink mt-0.5">
        {value}
      </p>
    </div>
  );
}
