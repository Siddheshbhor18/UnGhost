"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { Bootcamp, User, Job } from "@/shared/types";

interface Props {
  student: User;
  job?: Job;
  onClose: () => void;
  onComplete: (sponsorshipId: string) => void;
}

type Phase = "loading" | "pick" | "confirm" | "paying" | "success" | "error";

export function SponsorBootcampModal({ student, job, onClose, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [bcs, setBcs] = useState<Bootcamp[]>([]);
  const [chosen, setChosen] = useState<Bootcamp | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute the student's skill gaps for this job, then fetch matching bootcamps.
  useEffect(() => {
    async function load() {
      try {
        const studentSkills = (student.profile?.skills ?? []).map((s) =>
          s.toLowerCase(),
        );
        const verified = new Set(
          (student.profile?.verifiedSkills ?? []).map((s) => s.toLowerCase()),
        );
        const requiredGap = job
          ? job.skills.filter(
              (s) =>
                !studentSkills.includes(s.toLowerCase()) ||
                !verified.has(s.toLowerCase()),
            )
          : (student.profile?.skills ?? []).slice(0, 3);
        const targets = requiredGap.length > 0 ? requiredGap : job?.skills ?? [];

        // Fetch bootcamps per skill in parallel; merge unique.
        const seen = new Set<string>();
        const merged: Bootcamp[] = [];
        for (const skill of targets) {
          const r = await fetch(
            `/api/bootcamps?skill=${encodeURIComponent(skill)}`,
          );
          if (!r.ok) continue;
          const list: Bootcamp[] = await r.json();
          for (const b of list) {
            if (!seen.has(b.id)) {
              seen.add(b.id);
              merged.push(b);
            }
          }
        }
        // Fallback: top 3 bootcamps if no gap matches
        if (merged.length === 0) {
          const all = await fetch("/api/bootcamps").then((r) => r.json());
          merged.push(...(all as Bootcamp[]).slice(0, 3));
        }
        setBcs(merged.slice(0, 4));
        setPhase("pick");
      } catch {
        setError("Couldn't load bootcamps.");
        setPhase("error");
      }
    }
    load();
  }, [student, job]);

  async function confirmAndPay() {
    if (!chosen) return;
    setPhase("paying");
    try {
      const res = await fetch("/api/recruiter/sponsorships", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          bootcampId: chosen.id,
          jobId: job?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sponsorship failed");
        setPhase("error");
        return;
      }
      // Simulate PhonePe redirect/webhook delay
      await new Promise((r) => setTimeout(r, 1100));
      setPhase("success");
      setTimeout(() => onComplete(data.id), 1400);
    } catch {
      setError("Payment service unreachable.");
      setPhase("error");
    }
  }

  const totalWithGst = chosen
    ? Math.round(chosen.priceINR * 1.18)
    : 0;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl">
        <GlassCard
          variant="strong"
          className="!p-6 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
                Sponsor a Bootcamp
              </p>
              <h2 className="font-display font-bold text-xl text-brand-ink mt-1">
                Close {student.name}&apos;s gap
              </h2>
              <p className="text-xs text-brand-muted mt-1">
                {job
                  ? `For: ${job.title} · gap-matched`
                  : "General sponsorship"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-brand-muted hover:text-rose-600"
            >
              <X size={18} />
            </button>
          </div>

          {phase === "loading" && (
            <div className="text-center py-10">
              <Loader2
                size={28}
                className="mx-auto text-brand-primary animate-spin mb-3"
              />
              <p className="text-sm text-brand-muted">
                Matching bootcamps to gap skills…
              </p>
            </div>
          )}

          {phase === "pick" && (
            <div className="mt-5 space-y-3">
              <p className="text-xs text-brand-muted">
                Pick one bootcamp to sponsor. The student gets a free unlock +
                30 days to accept. On completion, their Verified Skill badge
                lands on their profile (visible to your kanban).
              </p>
              {bcs.length === 0 ? (
                <p className="text-sm text-brand-muted text-center py-6">
                  No matching bootcamps yet.
                </p>
              ) : (
                bcs.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setChosen(b)}
                    className={`w-full text-left rounded-2xl border p-4 transition ${
                      chosen?.id === b.id
                        ? "bg-brand-primary/10 border-brand-primary shadow-brand-glow"
                        : "bg-white/40 border-brand-ink/10 hover:border-brand-primary/40 hover:bg-white/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <GlassBadge tone="brand">{b.skill}</GlassBadge>
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-semibold">
                            <Star size={11} fill="currentColor" /> {b.rating}
                          </span>
                        </div>
                        <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
                          {b.title}
                        </p>
                        <p className="text-xs text-brand-muted line-clamp-1 mt-0.5">
                          {b.description}
                        </p>
                      </div>
                      <p className="font-display font-bold text-brand-ink shrink-0">
                        ₹{b.priceINR.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </button>
                ))
              )}

              <div className="pt-4 border-t border-brand-ink/5 flex justify-end gap-2">
                <GlassButton variant="glass" onClick={onClose}>
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="brand"
                  disabled={!chosen}
                  onClick={() => setPhase("confirm")}
                >
                  Continue →
                </GlassButton>
              </div>
            </div>
          )}

          {phase === "confirm" && chosen && (
            <div className="mt-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
                Order summary
              </p>
              <div className="rounded-2xl bg-white/50 border border-brand-ink/5 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
                    <GraduationCap size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
                      {chosen.title}
                    </p>
                    <p className="text-xs text-brand-muted">
                      Closes {chosen.skill} gap for {student.name}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <Row label="Bootcamp" value={`₹${chosen.priceINR.toLocaleString("en-IN")}`} />
                  <Row label="GST 18%" value={`₹${(totalWithGst - chosen.priceINR).toLocaleString("en-IN")}`} />
                  <Row
                    label="Total"
                    value={`₹${totalWithGst.toLocaleString("en-IN")}`}
                    bold
                  />
                </ul>
              </div>
              <p className="text-[11px] text-brand-muted mb-4 leading-relaxed">
                Charged to your company account via PhonePe.{" "}
                <span className="text-rose-700 font-semibold">
                  Non-refundable
                </span>{" "}
                once accepted by the candidate.
              </p>
              <div className="flex justify-end gap-2">
                <GlassButton variant="glass" onClick={() => setPhase("pick")}>
                  ← Back
                </GlassButton>
                <GlassButton variant="brand" onClick={confirmAndPay}>
                  Pay ₹{totalWithGst.toLocaleString("en-IN")} →
                </GlassButton>
              </div>
            </div>
          )}

          {phase === "paying" && (
            <div className="text-center py-10">
              <Loader2
                size={28}
                className="mx-auto text-brand-primary animate-spin mb-3"
              />
              <p className="font-display font-semibold text-brand-ink">
                Processing payment…
              </p>
              <p className="text-xs text-brand-muted mt-1">
                Mock PhonePe handshake (no real charge)
              </p>
            </div>
          )}

          {phase === "success" && (
            <div className="text-center py-8">
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-glass-lg mb-3">
                <CheckCircle2 size={28} />
              </div>
              <p className="font-display font-bold text-xl text-brand-ink">
                Sponsorship offered ✓
              </p>
              <p className="text-sm text-brand-muted mt-2">
                {student.name} has been notified · 30 days to accept · you&apos;ll
                see progress in real-time on the Kanban.
              </p>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center py-8">
              <X
                size={28}
                className="mx-auto text-rose-600 mb-2"
              />
              <p className="font-display font-semibold text-rose-700">
                Couldn&apos;t complete sponsorship
              </p>
              <p className="text-xs text-brand-muted mt-1">
                {error ?? "Try again in a moment."}
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
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className={bold ? "text-brand-ink font-semibold" : "text-brand-muted"}>
        {label}
      </span>
      <span
        className={
          bold
            ? "font-display font-extrabold text-brand-ink"
            : "text-brand-ink"
        }
      >
        {value}
      </span>
    </li>
  );
}
