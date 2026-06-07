"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Film,
  Lock,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
} from "@/components/glass";
import type { Bootcamp, SessionRecording } from "@/shared/types";
import clsx from "clsx";

interface LiveSessionLite {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  status: "scheduled" | "live" | "ended" | "cancelled";
  roomCode: string;
  registeredCount: number;
}

interface Props {
  bootcamp: Bootcamp;
  initialEnrolled: boolean;
  recordings: SessionRecording[];
  liveSessions?: LiveSessionLite[];
}

/**
 * Interactive island. Receives the bootcamp already fetched on the server,
 * so first paint shows real content — no `Loading…` flash, no client-side
 * /api/bootcamps round-trip on mount.
 */
export function BootcampDetailClient({
  bootcamp: bc,
  initialEnrolled,
  recordings,
  liveSessions = [],
}: Props) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolError, setEnrolError] = useState<string | null>(null);
  // Modal state for the replay player. Null = closed.
  const [replay, setReplay] = useState<SessionRecording | null>(null);
  const [activeVideo, setActiveVideo] = useState(0);

  async function enrolNow() {
    setEnrolError(null);
    setEnrolling(true);
    try {
      const res = await fetch(`/api/bootcamps/${bc.id}/enrol`, { method: "POST" });
      const data = await res.json();
      if (res.status === 402) {
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

  const v = bc.videos[activeVideo];
  const hasVideo = !!v;

  return (
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
            <GlassBadge tone="brand" className="mb-2">
              {bc.skill}
            </GlassBadge>
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
              <span>
                {bc.videos.length} recorded · {bc.liveSlots.length} live
              </span>
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
              <a
                href={`/student/my-bootcamps/${bc.id}/learn`}
                className="btn-brand"
              >
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
              {enrolled && hasVideo ? (
                <div className="text-center">
                  <PlayCircle className="mx-auto opacity-90" size={72} />
                  <p className="font-display font-bold mt-3">{v.title}</p>
                  <p className="text-xs opacity-80 mt-1">
                    {v.durationMin} min · playback simulated
                  </p>
                </div>
              ) : enrolled ? (
                <div className="text-center">
                  <PlayCircle className="mx-auto opacity-90" size={72} />
                  <p className="font-display font-bold mt-3">Modules coming soon</p>
                  <p className="text-xs opacity-80 mt-1">
                    Instructor hasn't uploaded videos yet.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Lock className="mx-auto opacity-80" size={48} />
                  <p className="font-display font-bold mt-3">Locked</p>
                  <p className="text-xs opacity-80">
                    Enroll to unlock recorded modules
                  </p>
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

          {/* Skill verification happens inside the learn flow — watch each
              lesson, pass its skill-check, submit the graded assignment. The
              badge is issued there, never from a one-off free-text box here. */}
          {enrolled && hasVideo && (
            <GlassCard className="p-6 border border-brand-primary/20 text-center">
              <ShieldCheck
                size={22}
                className="mx-auto text-brand-primary mb-2"
              />
              <p className="font-display font-bold text-brand-ink">
                Earn your Verified {bc.skill} badge
              </p>
              <p className="text-sm text-brand-muted mt-1 mb-4 max-w-md mx-auto">
                Work through the lessons, clear each skill-check, and submit the
                graded assignment. Your badge unlocks when the bootcamp is
                complete.
              </p>
              <a
                href={`/student/my-bootcamps/${bc.id}/learn`}
                className="btn-brand inline-flex"
              >
                Continue learning →
              </a>
            </GlassCard>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <GlassCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary mb-2 inline-flex items-center gap-1.5">
              <Calendar size={12} /> Live workshops
            </p>
            {liveSessions.length === 0 ? (
              <p className="text-sm text-brand-muted">
                No upcoming sessions yet. The instructor will schedule one soon.
              </p>
            ) : (
              <ul className="space-y-2">
                {liveSessions.map((s) => {
                  const isLive = s.status === "live";
                  const startsIn =
                    new Date(s.startsAt).getTime() - Date.now();
                  const joinable =
                    isLive || (startsIn > 0 && startsIn < 15 * 60_000);
                  return (
                    <li
                      key={s.id}
                      className={clsx(
                        "rounded-xl border px-3 py-2.5",
                        isLive
                          ? "border-rose-500/30 bg-rose-500/5"
                          : "border-brand-ink/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-brand-ink line-clamp-1">
                            {s.title}
                          </p>
                          <p className="text-[11px] text-brand-muted mt-0.5">
                            {new Date(s.startsAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}{" "}
                            · {s.durationMin}m
                          </p>
                        </div>
                        {isLive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Live
                          </span>
                        )}
                      </div>
                      {enrolled && joinable ? (
                        <a
                          href={`/live/${s.roomCode}`}
                          className="mt-2 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-brand-primary text-white px-3 py-1.5 text-xs font-semibold hover:bg-brand-primary/90"
                        >
                          {isLive ? "Join live room" : "Open room"}
                        </a>
                      ) : !enrolled ? (
                        <p className="text-[10px] text-brand-muted mt-2">
                          Enrol to join.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          {/* Past sessions — replays of finished live classes. Visible only
              when the instructor kept the recording AND the student has
              enrolled (Premium plan unlocks bootcamps + replays). */}
          {recordings.length > 0 ? (
            <GlassCard className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary mb-2 inline-flex items-center gap-1.5">
                <Film size={12} /> Past sessions · {recordings.length}
              </p>
              {!enrolled ? (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 flex items-start gap-2">
                  <Lock
                    size={14}
                    className="text-violet-700 mt-0.5 shrink-0"
                  />
                  <p className="text-xs text-violet-900 leading-relaxed">
                    Recorded sessions are part of the bootcamp.{" "}
                    <a
                      href="/upgrade?to=premium"
                      className="underline font-semibold"
                    >
                      Go Premium
                    </a>{" "}
                    to enrol and replay any past class.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recordings.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setReplay(r)}
                        disabled={!r.playbackUrl}
                        className={clsx(
                          "w-full text-left rounded-xl px-3 py-2.5 border transition flex items-center gap-3",
                          "border-brand-ink/10 hover:border-brand-primary/40 hover:bg-brand-primary/5",
                          !r.playbackUrl && "opacity-60 cursor-not-allowed",
                        )}
                      >
                        <span className="grid place-items-center w-10 h-10 rounded-lg bg-brand-gradient text-white shrink-0 overflow-hidden">
                          {r.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PlayCircle size={16} />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-brand-ink line-clamp-1">
                            {r.sessionTitle}
                          </p>
                          <p className="text-[11px] text-brand-muted inline-flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={10} />
                              {fmtDuration(r.durationSec)}
                            </span>
                            <span>
                              {new Date(r.createdAt).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short" },
                              )}
                            </span>
                          </p>
                        </span>
                        <PlayCircle
                          size={16}
                          className="text-brand-primary shrink-0"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          ) : null}

          <GlassCard className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary mb-2">
              What you unlock
            </p>
            <ul className="text-sm text-brand-ink/80 space-y-1.5">
              <li>
                · Verified{" "}
                <span className="text-brand-primary font-semibold">{bc.skill}</span>{" "}
                badge on profile
              </li>
              <li>· Recruiters can filter on verified-skill</li>
              <li>· Bridges 2-3 missions you couldn&apos;t apply to before</li>
              <li>· Lifetime access to recorded modules</li>
            </ul>
          </GlassCard>
        </aside>
      </div>

      {/* Replay modal — full-screen player. Backdrop click + Esc close it. */}
      {replay && replay.playbackUrl ? (
        <ReplayModal recording={replay} onClose={() => setReplay(null)} />
      ) : null}
    </div>
  );
}

function ReplayModal({
  recording,
  onClose,
}: {
  recording: SessionRecording;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-brand-ink rounded-2xl overflow-hidden shadow-glass-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white line-clamp-1">
              {recording.sessionTitle}
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">
              {fmtDuration(recording.durationSec)} ·{" "}
              {new Date(recording.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Close player"
          >
            <X size={16} />
          </button>
        </div>
        <video
          src={recording.playbackUrl}
          poster={recording.thumbnailUrl}
          controls
          autoPlay
          className="w-full aspect-video bg-black"
        />
      </div>
    </div>
  );
}

function fmtDuration(sec?: number) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m`;
}
