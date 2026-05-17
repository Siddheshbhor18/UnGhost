"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Calendar, Check, Lock, PlayCircle, Send, Sparkles, Star, Users } from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassNavbar,
  GlassTextarea,
} from "@/components/glass";
import type { Bootcamp } from "@/shared/types";
import clsx from "clsx";

export default function BootcampPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [bc, setBc] = useState<Bootcamp | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState(0);
  const [verifyText, setVerifyText] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ passed: boolean; message: string; skill?: string } | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  async function enrolNow() {
    if (!bc) return;
    setEnrolError(null);
    setEnrolling(true);
    try {
      const res = await fetch(`/api/bootcamps/${bc.id}/enrol`, { method: "POST" });
      const data = await res.json();
      if (res.status === 402) {
        // Premium-only — bounce to upgrade page with bootcamp context.
        router.push(`/upgrade?to=premium`);
        return;
      }
      if (!res.ok) {
        setEnrolError(data.error ?? "Enrol failed. Try again.");
        return;
      }
      setEnrolled(true);
    } catch (err) {
      setEnrolError((err as Error).message);
    } finally {
      setEnrolling(false);
    }
  }

  useEffect(() => {
    fetch("/api/bootcamps")
      .then((r) => r.json())
      .then((all: Bootcamp[]) => {
        const target = all.find((b) => b.id === params.id);
        setBc(target ?? null);
        if (target && session?.user?.id) {
          setEnrolled(target.enrolledStudentIds.includes(session.user.id));
        }
      });
  }, [params.id, session]);

  async function verify() {
    if (!bc) return;
    const r = await fetch("/api/bootcamps/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bootcampId: bc.id, response: verifyText }),
    });
    setVerifyResult(await r.json());
  }

  if (!bc)
    return (
      <main className="relative min-h-screen">
        <BlobField />
        <GlassNavbar />
        <p className="text-center py-20 text-brand-muted">Loading…</p>
      </main>
    );

  const v = bc.videos[activeVideo];

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 space-y-5">
        <Link
          href="/bootcamps"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold hover:gap-2 transition-all"
        >
          <ArrowLeft size={14} /> Bootcamp catalog
        </Link>

        {/* Hero */}
        <GlassCard variant="strong" className="p-7">
          <div className="flex items-start justify-between flex-wrap gap-5">
            <div className="flex-1 min-w-0">
              <GlassBadge tone="brand" className="mb-2">{bc.skill}</GlassBadge>
              <h1 className="font-display font-extrabold text-2xl md:text-3xl text-brand-ink">
                {bc.title}
              </h1>
              <p className="text-brand-muted mt-2 max-w-2xl">{bc.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-brand-muted mt-3">
                <span className="inline-flex items-center gap-1">
                  <Star className="text-amber-500" size={13} />
                  {bc.rating}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={13} />
                  {bc.enrolledStudentIds.length} enrolled
                </span>
                <span>{bc.durationWeeks} weeks</span>
                <span>{bc.videos.length} recorded · {bc.liveSlots.length} live</span>
              </div>
              <Link
                href={`/instructor/${bc.instructorId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline mt-3"
              >
                View instructor profile →
              </Link>
            </div>
            {enrolled ? (
              <div className="flex flex-col items-end gap-2">
                <GlassBadge tone="success">
                  <Check size={12} /> Enrolled
                </GlassBadge>
                <a href={`/student/my-bootcamps/${bc.id}/learn`} className="btn-brand">
                  Continue learning →
                </a>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-brand-muted mb-1">
                  Included with
                </p>
                <p className="font-display font-extrabold text-2xl text-brand-ink mb-2 inline-flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-600" /> Premium
                </p>
                <GlassButton
                  variant="brand"
                  size="lg"
                  onClick={enrolNow}
                  disabled={enrolling}
                >
                  {enrolling ? "Working…" : "Enroll now"}
                </GlassButton>
                {enrolError ? (
                  <p className="text-xs text-red-600 mt-2">{enrolError}</p>
                ) : null}
              </div>
            )}
          </div>
        </GlassCard>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Player + verify */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="p-5">
              <div className="relative aspect-video rounded-2xl bg-brand-gradient overflow-hidden flex items-center justify-center text-white">
                {enrolled ? (
                  <div className="text-center">
                    <PlayCircle className="mx-auto opacity-90" size={72} />
                    <p className="font-display font-bold mt-3">{v.title}</p>
                    <p className="text-xs opacity-80 mt-1">
                      {v.durationMin} min · playback simulated
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Lock className="mx-auto opacity-80" size={48} />
                    <p className="font-display font-bold mt-3">Locked</p>
                    <p className="text-xs opacity-80">Enroll to unlock recorded modules</p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-2">
                {bc.videos.map((vid, i) => (
                  <button
                    key={vid.id}
                    onClick={() => enrolled && setActiveVideo(i)}
                    className={clsx(
                      "text-left rounded-xl px-3 py-2.5 border transition",
                      i === activeVideo
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-brand-ink/10 hover:border-brand-primary/40",
                      !enrolled && "opacity-50 cursor-not-allowed",
                    )}
                    disabled={!enrolled}
                  >
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-brand-muted">
                      Module {String(i + 1).padStart(2, "0")} · {vid.durationMin} min
                    </p>
                    <p className="text-sm text-brand-ink font-semibold line-clamp-1 mt-0.5">
                      {vid.title}
                    </p>
                  </button>
                ))}
                <div className="rounded-xl px-3 py-2.5 border border-brand-primary/30 bg-brand-primary/5">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-brand-primary">
                    Live · alignment session
                  </p>
                  <p className="text-sm text-brand-ink font-semibold mt-0.5">
                    Pick a slot on the right →
                  </p>
                </div>
              </div>
            </GlassCard>

            {enrolled && (
              <GlassCard className="p-6 border border-brand-primary/20">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary mb-2">
                  Skill verify gate
                </p>
                <p className="text-sm text-brand-ink/80 mb-3">{v.verifyPrompt}</p>
                <GlassTextarea
                  value={verifyText}
                  onChange={(e) => setVerifyText(e.target.value)}
                  className="min-h-[140px]"
                  placeholder="Type your understanding. Concrete and specific beats long-winded."
                />
                <div className="mt-3 flex justify-between items-center">
                  <p className="text-xs text-brand-muted">{verifyText.length} chars</p>
                  <GlassButton variant="brand" size="sm" onClick={verify}>
                    <Send size={12} /> Verify comprehension
                  </GlassButton>
                </div>
                {verifyResult && (
                  <div
                    className={clsx(
                      "mt-3 rounded-xl px-3 py-2.5 text-sm",
                      verifyResult.passed
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-700"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-700",
                    )}
                  >
                    <p className="font-semibold">
                      {verifyResult.passed ? "Verified ✓" : "Not yet"}
                    </p>
                    <p className="mt-1">{verifyResult.message}</p>
                  </div>
                )}
              </GlassCard>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <GlassCard className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary mb-2 inline-flex items-center gap-1.5">
                <Calendar size={12} /> Live alignment
              </p>
              <p className="text-sm text-brand-muted mb-3">
                Pick a slot to RSVP. Capped at 25 students.
              </p>
              <div className="space-y-2">
                {bc.liveSlots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    disabled={!enrolled}
                    className={clsx(
                      "w-full text-left rounded-xl px-3 py-2.5 border text-sm transition",
                      slot === s
                        ? "border-brand-primary bg-brand-primary/5 text-brand-ink"
                        : "border-brand-ink/10 text-brand-ink/80 hover:border-brand-primary/40",
                      !enrolled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {new Date(s).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </button>
                ))}
              </div>
              {slot && (
                <GlassButton variant="brand" size="sm" fullWidth className="mt-3">
                  RSVP for live session
                </GlassButton>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary mb-2">
                What you unlock
              </p>
              <ul className="text-sm text-brand-ink/80 space-y-1.5">
                <li>
                  · Verified <span className="text-brand-primary font-semibold">{bc.skill}</span>{" "}
                  badge on profile
                </li>
                <li>· Recruiters can filter on verified-skill</li>
                <li>· Bridges 2-3 missions you couldn&apos;t apply to before</li>
                <li>· Lifetime access to recorded modules</li>
              </ul>
            </GlassCard>
          </aside>
        </div>
      </div>

    </main>
  );
}
