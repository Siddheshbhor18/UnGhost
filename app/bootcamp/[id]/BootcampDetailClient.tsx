"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
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
import clsx from "clsx";
import { GlassBadge, GlassCard } from "@/components/glass";
import { VideoPlayer } from "@/components/bootcamp/VideoPlayer";
import { AddToCartButton } from "@/components/courses/AddToCartButton";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import type { Bootcamp, SessionRecording } from "@/shared/types";
import { roomLabel } from "@/shared/rooms";
import { COURSE_CONTENT } from "@/shared/course-content";
import { COURSE_PRICE_PAISE } from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";

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
  /** True iff the buyer owns the parent course — the single access gate. */
  ownsRoom: boolean;
  /** Legacy flag retained for the "Enrolled" badge — purely informational
   *  now that ownership drives access. Auto-set on the server for owners. */
  initialEnrolled: boolean;
  recordings: SessionRecording[];
  liveSessions?: LiveSessionLite[];
}

/**
 * Cohort detail (a "subject" inside a course room). The single gate is
 * `ownsRoom`: owners stream every lesson directly, no enroll click, no
 * locked thumbnails. Non-owners (defensive — the room hub already gates,
 * but a direct deep-link could land here) see a premium purchase wall.
 *
 * UI tiers:
 *   1. Hero band — title, instructor, stats, primary CTA / "Owned" badge.
 *   2. Player + lesson rail — autoplays the first lesson for owners; a
 *      teaser frame for non-owners.
 *   3. Sidebar — live sessions, past replays, verified-skill promise.
 */
export function BootcampDetailClient({
  bootcamp: bc,
  ownsRoom,
  initialEnrolled,
  recordings,
  liveSessions = [],
}: Props) {
  const [replay, setReplay] = useState<SessionRecording | null>(null);
  const [activeVideo, setActiveVideo] = useState(0);
  const v = bc.videos[activeVideo];
  const hasVideo = !!v;
  const visual = COURSE_VISUAL[bc.category];
  const { tagline } = COURSE_CONTENT[bc.category];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 space-y-6">
      <Link
        href={`/bootcamps/${bc.category}`}
        className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold hover:gap-2 transition-all"
      >
        <ArrowLeft size={14} /> {roomLabel(bc.category)} room
      </Link>

      {/* Hero — gradient header pulled from the course's signature colour */}
      <article
        className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
        style={{
          backgroundImage: `linear-gradient(135deg, ${visual.from} 0%, ${visual.to} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-black/20 blur-2xl"
        />

        <div className="relative grid gap-7 p-7 md:grid-cols-[1fr_auto] md:items-end md:p-9">
          <div className="text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20 backdrop-blur">
              <Sparkles size={11} /> {roomLabel(bc.category)}
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              {bc.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/80">
              {bc.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Star size={13} className="text-amber-300" /> {bc.rating}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} /> {bc.enrolledStudentIds.length} students
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} /> {bc.durationWeeks} weeks
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Film size={13} /> {bc.videos.length} lessons ·{" "}
                {bc.liveSlots.length} live
              </span>
            </div>
            <p className="mt-3 text-[12px] text-white/70">{tagline}</p>
          </div>

          {/* Access state — the only thing in the hero that differs between
              owners and non-owners. Mirror image stays the same. */}
          <div className="flex flex-col items-stretch gap-2 md:items-end">
            {ownsRoom ? (
              <>
                <GlassBadge tone="success" className="self-start md:self-end">
                  <CheckCircle2 size={12} /> Full access
                </GlassBadge>
                <p className="hidden text-[12px] text-white/75 md:block">
                  Watch every lesson, attend every live session. No enrol
                  step needed.
                </p>
                {initialEnrolled ? null : (
                  <p className="text-[11px] text-white/55">
                    We&apos;ll log your progress automatically.
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                  Course access
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold tnum text-white">
                  {formatPaiseAsINR(COURSE_PRICE_PAISE)}
                </p>
                <p className="text-[11.5px] text-white/65">
                  Unlocks every cohort in {roomLabel(bc.category)} for 3
                  months.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <AddToCartButton
                    id={bc.category}
                    size="md"
                    fullWidth
                    labels={{
                      add: "Add course to cart",
                      added: "In cart",
                    }}
                  />
                  <Link
                    href={`/bootcamps/checkout?course=${bc.category}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
                  >
                    Go straight to checkout
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Player + lesson list */}
        <div className="space-y-4 lg:col-span-2">
          <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_22px_55px_-26px_rgba(0,0,0,0.45)]">
            {ownsRoom && hasVideo ? (
              <VideoPlayer
                url={v.url ?? null}
                posterUrl={v.posterUrl}
                title={v.title}
              />
            ) : (
              <PlayerPlaceholder
                ownsRoom={ownsRoom}
                hasVideo={hasVideo}
                visual={visual}
              />
            )}

            {/* Lesson rail — owners can click any lesson; non-owners see the
                same list grayed so they understand the curriculum scope. */}
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {bc.videos.map((vid, i) => (
                <LessonRow
                  key={vid.id}
                  index={i}
                  total={bc.videos.length}
                  title={vid.title}
                  durationMin={vid.durationMin}
                  moduleTitle={vid.moduleTitle}
                  active={i === activeVideo}
                  unlocked={ownsRoom}
                  onClick={() => ownsRoom && setActiveVideo(i)}
                />
              ))}
              {bc.videos.length === 0 ? (
                <p className="col-span-full rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-[12.5px] text-neutral-500">
                  Curriculum is being uploaded — check back soon.
                </p>
              ) : null}
            </div>
          </div>

          {/* Skill-verify promise — same for everyone; reinforces what the
              cohort delivers when complete. */}
          <SkillVerifyCard skill={bc.skill} ownsRoom={ownsRoom} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <LiveSessionsCard sessions={liveSessions} ownsRoom={ownsRoom} />
          {recordings.length > 0 ? (
            <ReplaysCard
              recordings={recordings}
              ownsRoom={ownsRoom}
              onOpenReplay={(r) => setReplay(r)}
            />
          ) : null}
          <PerksCard skill={bc.skill} />
        </aside>
      </div>

      {replay && replay.playbackUrl ? (
        <ReplayModal recording={replay} onClose={() => setReplay(null)} />
      ) : null}
    </div>
  );
}

// ─── Hero player placeholder ────────────────────────────────────────────────

function PlayerPlaceholder({
  ownsRoom,
  hasVideo,
  visual,
}: {
  ownsRoom: boolean;
  hasVideo: boolean;
  visual: (typeof COURSE_VISUAL)[keyof typeof COURSE_VISUAL];
}) {
  return (
    <div
      className="relative grid aspect-video place-items-center overflow-hidden text-white"
      style={{
        backgroundImage: `linear-gradient(135deg, ${visual.from} 0%, ${visual.to} 100%)`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="relative text-center">
        {ownsRoom ? (
          <>
            <PlayCircle className="mx-auto opacity-90" size={72} />
            <p className="mt-3 font-display text-lg font-bold">
              {hasVideo ? "Press play to begin" : "Lessons coming soon"}
            </p>
            <p className="mt-1 text-xs opacity-80">
              {hasVideo
                ? "Your first lesson is ready below."
                : "The instructor hasn't uploaded videos yet."}
            </p>
          </>
        ) : (
          <>
            <Lock className="mx-auto opacity-80" size={48} />
            <p className="mt-3 font-display text-lg font-bold">Course-gated</p>
            <p className="mt-1 text-xs opacity-80">
              Buy the course to unlock every lesson in this room.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Lesson row ─────────────────────────────────────────────────────────────

function LessonRow({
  index,
  total,
  title,
  durationMin,
  moduleTitle,
  active,
  unlocked,
  onClick,
}: {
  index: number;
  total: number;
  title: string;
  durationMin: number;
  moduleTitle?: string;
  active: boolean;
  unlocked: boolean;
  onClick: () => void;
}) {
  const label = `Lesson ${String(index + 1).padStart(2, "0")} of ${String(
    total,
  ).padStart(2, "0")}`;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!unlocked}
      className={clsx(
        "group/lesson flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
        active && unlocked
          ? "border-brand-primary bg-brand-primary/[0.06]"
          : "border-neutral-200 hover:border-brand-primary/40",
        !unlocked && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={clsx(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white",
          active && unlocked
            ? "bg-brand-gradient shadow-brand-glow"
            : "bg-neutral-200 text-neutral-500 group-hover/lesson:bg-brand-gradient group-hover/lesson:text-white",
        )}
      >
        {unlocked ? <PlayCircle size={15} /> : <Lock size={13} />}
      </span>
      <span className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-neutral-400">
          {label} · {durationMin}m
          {moduleTitle?.trim() ? ` · ${moduleTitle.trim()}` : ""}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[13.5px] font-semibold text-neutral-900">
          {title}
        </p>
      </span>
    </button>
  );
}

// ─── Sidebar cards ──────────────────────────────────────────────────────────

function LiveSessionsCard({
  sessions,
  ownsRoom,
}: {
  sessions: LiveSessionLite[];
  ownsRoom: boolean;
}) {
  return (
    <GlassCard className="p-5">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
        <Calendar size={12} /> Live workshops
      </p>
      {sessions.length === 0 ? (
        <p className="text-sm text-brand-muted">
          No upcoming sessions yet — the instructor will schedule one soon.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const isLive = s.status === "live";
            const startsIn = new Date(s.startsAt).getTime() - Date.now();
            const joinable = isLive || (startsIn > 0 && startsIn < 15 * 60_000);
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
                    <p className="line-clamp-1 text-sm font-semibold text-brand-ink">
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-brand-muted">
                      {new Date(s.startsAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · {s.durationMin}m
                    </p>
                  </div>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-600">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                      Live
                    </span>
                  ) : null}
                </div>
                {ownsRoom && joinable ? (
                  <a
                    href={`/live/${s.roomCode}`}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary/90"
                  >
                    {isLive ? "Join live room" : "Open room"}
                  </a>
                ) : !ownsRoom ? (
                  <p className="mt-2 text-[10px] text-brand-muted">
                    Course-gated. Buy to attend.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

function ReplaysCard({
  recordings,
  ownsRoom,
  onOpenReplay,
}: {
  recordings: SessionRecording[];
  ownsRoom: boolean;
  onOpenReplay: (r: SessionRecording) => void;
}) {
  return (
    <GlassCard className="p-5">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
        <Film size={12} /> Past sessions · {recordings.length}
      </p>
      {!ownsRoom ? (
        <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
          <Lock size={14} className="mt-0.5 shrink-0 text-violet-700" />
          <p className="text-xs leading-relaxed text-violet-900">
            Replays are course-gated. Buy the course to unlock every past
            session.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {recordings.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onOpenReplay(r)}
                disabled={!r.playbackUrl}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl border border-brand-ink/10 px-3 py-2.5 text-left transition hover:border-brand-primary/40 hover:bg-brand-primary/5",
                  !r.playbackUrl && "cursor-not-allowed opacity-60",
                )}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-gradient text-white">
                  {r.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PlayCircle size={16} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-brand-ink">
                    {r.sessionTitle}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-2 text-[11px] text-brand-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={10} />
                      {fmtDuration(r.durationSec)}
                    </span>
                    <span>
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </p>
                </span>
                <PlayCircle size={16} className="shrink-0 text-brand-primary" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function SkillVerifyCard({
  skill,
  ownsRoom,
}: {
  skill: string;
  ownsRoom: boolean;
}) {
  return (
    <GlassCard className="border border-brand-primary/20 p-6 text-center">
      <ShieldCheck size={22} className="mx-auto mb-2 text-brand-primary" />
      <p className="font-display font-bold text-brand-ink">
        Earn your Verified {skill} badge
      </p>
      <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-brand-muted">
        Watch every lesson, clear each skill-check, and submit the graded
        assignment. The badge unlocks when the cohort is complete.
      </p>
      {!ownsRoom ? (
        <p className="text-[11.5px] text-brand-muted">
          The badge is course-gated — buy the course to start the gauntlet.
        </p>
      ) : null}
    </GlassCard>
  );
}

function PerksCard({ skill }: { skill: string }) {
  return (
    <GlassCard className="p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
        What you unlock
      </p>
      <ul className="space-y-1.5 text-sm text-brand-ink/80">
        <li>
          · Verified{" "}
          <span className="font-semibold text-brand-primary">{skill}</span>{" "}
          badge on your profile
        </li>
        <li>· Recruiters can filter on verified-skill</li>
        <li>· Bridges 2–3 missions you couldn&apos;t apply to before</li>
        <li>· 3-month access to every lesson + live session</li>
      </ul>
    </GlassCard>
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
