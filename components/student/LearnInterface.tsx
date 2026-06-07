"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  GraduationCap,
  Lock,
  PenLine,
  PlayCircle,
  ShieldCheck,
  Video,
  Sparkles,
  PenSquare,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import { TutorPanel } from "@/components/student/TutorPanel";
import { SkillCheckModal } from "@/components/student/SkillCheckModal";
import { VideoPlayer } from "@/components/bootcamp/VideoPlayer";
import type { Bootcamp, BootcampProgress } from "@/shared/types";

interface UpcomingLive {
  id: string;
  title: string;
  startsAt: string;
  durationMin: number;
  status: "scheduled" | "live" | "ended" | "cancelled";
  roomCode: string;
}

interface Props {
  bootcamp: Bootcamp;
  instructorName: string;
  initialProgress: BootcampProgress;
  upcomingLive?: UpcomingLive[];
}

type ContentTab = "overview" | "notes";

export function LearnInterface({
  bootcamp,
  instructorName,
  initialProgress,
  upcomingLive = [],
}: Props) {
  const nextLive = upcomingLive[0];
  const liveNow = upcomingLive.find((s) => s.status === "live");
  // Free navigation: students can watch any lesson in any order. Skill-checks
  // still track progress, and the live session + assignment + Verified badge
  // unlock only once every lesson's skill-check passes.
  const [progress, setProgress] = useState<BootcampProgress>(initialProgress);
  const [activeVideoId, setActiveVideoId] = useState<string>(
    bootcamp.videos[0]?.id ?? "",
  );
  const [skillCheckOpen, setSkillCheckOpen] = useState(false);
  const [contentTab, setContentTab] = useState<ContentTab>("overview");
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);
  const noteTimeout = useRef<NodeJS.Timeout | null>(null);

  const activeVideo = bootcamp.videos.find((v) => v.id === activeVideoId);
  const activeIdx = bootcamp.videos.findIndex((v) => v.id === activeVideoId);

  // Group lessons into instructor-defined modules. Consecutive lessons sharing
  // a moduleTitle form one section; lessons without one fall under "Lessons".
  const moduleSections = useMemo(() => {
    const sections: { title: string; videos: typeof bootcamp.videos }[] = [];
    for (const v of bootcamp.videos) {
      const key = v.moduleTitle?.trim() || "Lessons";
      const last = sections[sections.length - 1];
      if (last && last.title === key) last.videos.push(v);
      else sections.push({ title: key, videos: [v] });
    }
    return sections;
  }, [bootcamp.videos]);

  // Load notes for active video
  useEffect(() => {
    setNotesDraft(progress.notes[activeVideoId] ?? "");
  }, [activeVideoId, progress.notes]);

  // Auto-save notes on debounce
  function onNotesChange(v: string) {
    setNotesDraft(v);
    if (noteTimeout.current) clearTimeout(noteTimeout.current);
    setSavingNotes(true);
    noteTimeout.current = setTimeout(async () => {
      await fetch(`/api/student/bootcamps/${bootcamp.id}/progress`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notes: { videoId: activeVideoId, content: v },
        }),
      });
      setProgress((p) => ({
        ...p,
        notes: { ...p.notes, [activeVideoId]: v },
      }));
      setSavingNotes(false);
    }, 800);
  }

  async function markWatched() {
    if (!activeVideoId || progress.videosWatched.includes(activeVideoId)) return;
    await fetch(`/api/student/bootcamps/${bootcamp.id}/progress`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId: activeVideoId, watched: true }),
    });
    setProgress((p) => ({
      ...p,
      videosWatched: Array.from(new Set([...p.videosWatched, activeVideoId])),
    }));
  }

  const allChecksDone = bootcamp.videos.every((v) =>
    progress.skillChecksPassed.includes(v.id),
  );
  const totalLessons = bootcamp.videos.length;
  const completedCount = progress.skillChecksPassed.length;
  const pct = Math.round((completedCount / Math.max(1, totalLessons)) * 100);

  return (
    <div className="grid lg:grid-cols-12 gap-5">
      {/* ── Left: Curriculum ───────────────────────────── */}
      <aside className="lg:col-span-3 space-y-4">
        <Link
          href={`/bootcamp/${bootcamp.id}`}
          className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
        >
          <ChevronLeft size={12} /> Back to bootcamp
        </Link>

        <GlassCard className="!p-4">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
            Curriculum
          </p>
          <p className="text-xs text-brand-muted mb-3">
            {completedCount} of {totalLessons} verified · {pct}%
          </p>
          <div className="h-1.5 rounded-full bg-brand-ink/5 overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {moduleSections.map((section, si) => (
            <div key={`${section.title}-${si}`} className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.videos.map((v) => {
                  const watched = progress.videosWatched.includes(v.id);
                  const passed = progress.skillChecksPassed.includes(v.id);
                  const active = v.id === activeVideoId;
                  return (
                    <li key={v.id}>
                      <button
                        onClick={() => setActiveVideoId(v.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition ${
                          active
                            ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                            : "text-brand-ink hover:bg-white/40"
                        }`}
                      >
                        {passed ? (
                          <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                        ) : watched ? (
                          <PlayCircle size={11} className="text-amber-600 shrink-0" />
                        ) : (
                          <PlayCircle size={11} className="shrink-0" />
                        )}
                        <span className="flex-1 line-clamp-1">{v.title}</span>
                        <span className="text-[10px] text-brand-muted">
                          {v.durationMin}m
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
            Live &amp; assignment
          </p>
          <div className="space-y-1">
            {liveNow ? (
              <Link
                href={`/live/${liveNow.roomCode}`}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-rose-700 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/15 transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="flex-1 font-semibold">Live now — join</span>
              </Link>
            ) : nextLive ? (
              <Link
                href={`/live/${nextLive.roomCode}`}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-brand-ink hover:bg-white/40 transition"
              >
                <Video size={11} className="text-brand-primary" />
                <span className="flex-1 line-clamp-1">{nextLive.title}</span>
                <span className="text-[10px] text-brand-muted">
                  {new Date(nextLive.startsAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </Link>
            ) : (
              <div
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs ${
                  allChecksDone ? "text-brand-ink" : "text-brand-muted"
                }`}
              >
                {allChecksDone ? (
                  <Video size={11} className="text-brand-primary" />
                ) : (
                  <Lock size={11} />
                )}
                <span className="flex-1">Live workshop</span>
                <span className="text-[10px]">Not scheduled</span>
              </div>
            )}
            <Link
              href={
                allChecksDone
                  ? `/student/my-bootcamps/${bootcamp.id}/assignment`
                  : "#"
              }
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition ${
                allChecksDone
                  ? "text-brand-ink hover:bg-white/40"
                  : "text-brand-muted cursor-not-allowed pointer-events-none"
              }`}
            >
              {allChecksDone && !progress.assignment?.submittedAt ? (
                <PenLine size={11} className="text-amber-600" />
              ) : progress.assignment?.submittedAt ? (
                <CheckCircle2 size={11} className="text-emerald-600" />
              ) : (
                <Lock size={11} />
              )}
              <span className="flex-1">Post-session assignment</span>
            </Link>
          </div>
        </GlassCard>

        <Link
          href={`/instructor/${bootcamp.instructorId}`}
          className="block"
        >
          <GlassCard
            interactive
            className="!p-4 text-center"
          >
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              Instructor
            </p>
            <p className="font-display font-semibold text-sm text-brand-ink hover:text-brand-primary transition">
              {instructorName} →
            </p>
            <p className="text-xs text-brand-muted mt-1">
              ★ {bootcamp.rating.toFixed(1)} ·{" "}
              {bootcamp.enrolledStudentIds.length} students
            </p>
          </GlassCard>
        </Link>
      </aside>

      {/* ── Center: Player + content tabs ──────────────── */}
      <div className="lg:col-span-6 space-y-4">
        {/* Video stage — VideoPlayer auto-routes YouTube embed vs HTML5
            video vs "coming soon" placeholder depending on the URL shape. */}
        <GlassCard className="!p-0 overflow-hidden">
          <VideoPlayer
            url={activeVideo?.url ?? null}
            posterUrl={activeVideo?.posterUrl}
            title={activeVideo?.title}
          />
          <div className="p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
                Lesson {activeIdx + 1} of {totalLessons}
              </p>
              <h2 className="font-display font-bold text-lg text-brand-ink">
                {activeVideo?.title}
              </h2>
            </div>
            <div className="flex gap-2">
              <GlassButton
                variant="glass"
                size="sm"
                onClick={markWatched}
                disabled={progress.videosWatched.includes(activeVideoId)}
              >
                <CheckCircle2 size={12} />
                {progress.videosWatched.includes(activeVideoId)
                  ? "Watched"
                  : "Mark watched"}
              </GlassButton>
              <GlassButton
                variant="brand"
                size="sm"
                onClick={() => setSkillCheckOpen(true)}
                disabled={
                  !progress.videosWatched.includes(activeVideoId) ||
                  progress.skillChecksPassed.includes(activeVideoId)
                }
              >
                <ShieldCheck size={12} />
                {progress.skillChecksPassed.includes(activeVideoId)
                  ? "Verified ✓"
                  : "Skill check"}
              </GlassButton>
            </div>
          </div>
        </GlassCard>

        {/* Content tabs */}
        <GlassCard className="!p-0">
          <div className="flex border-b border-brand-ink/5">
            <TabBtn
              active={contentTab === "overview"}
              onClick={() => setContentTab("overview")}
              icon={<FileText size={13} />}
              label="Overview"
            />
            <TabBtn
              active={contentTab === "notes"}
              onClick={() => setContentTab("notes")}
              icon={<PenSquare size={13} />}
              label="My notes"
              extra={savingNotes ? "saving…" : undefined}
            />
          </div>

          <div className="p-5">
            {contentTab === "overview" && (
              <div className="space-y-3 text-sm text-brand-ink/90 leading-relaxed">
                {activeVideo?.description?.trim() ? (
                  <p className="whitespace-pre-line">
                    {activeVideo.description}
                  </p>
                ) : bootcamp.description?.trim() ? (
                  <p className="whitespace-pre-line">{bootcamp.description}</p>
                ) : (
                  <p className="text-brand-muted">
                    The instructor hasn&apos;t added a summary for this lesson
                    yet.
                  </p>
                )}
                <p>
                  <span className="font-semibold">Up next:</span>{" "}
                  {activeIdx + 1 < totalLessons
                    ? `${bootcamp.videos[activeIdx + 1].title}`
                    : "Live workshop + post-session assignment"}
                </p>
              </div>
            )}
            {contentTab === "notes" && (
              <div>
                <textarea
                  value={notesDraft}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Your notes for this lesson auto-save as you type…"
                  rows={8}
                  className="w-full bg-white/60 border border-brand-ink/10 rounded-xl px-3 py-2.5 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                />
                <p className="text-[10px] text-brand-muted mt-2">
                  Saved to your profile · visible only to you · synced across
                  devices
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Progress nudge */}
        {allChecksDone && !progress.assignment?.submittedAt && (
          <GlassCard glow className="text-center">
            <Sparkles size={20} className="mx-auto text-brand-primary mb-2" />
            <p className="font-display font-bold text-brand-ink">
              All skill checks cleared.
            </p>
            <p className="text-sm text-brand-muted mt-1 mb-4">
              The post-session assignment unlocks your Verified Skill badge.
            </p>
            <Link
              href={`/student/my-bootcamps/${bootcamp.id}/assignment`}
              className="btn-brand inline-flex"
            >
              <PenLine size={14} /> Start assignment
            </Link>
          </GlassCard>
        )}
        {progress.assignment?.submittedAt && (
          <GlassCard className="bg-emerald-500/5 border-emerald-500/20 text-center">
            <GraduationCap
              size={24}
              className="mx-auto text-emerald-600 mb-2"
            />
            <p className="font-display font-bold text-emerald-700">
              Bootcamp complete · Verified Skill badge issued
            </p>
            <p className="text-sm text-brand-muted mt-1">
              Your{" "}
              <span className="font-semibold text-brand-ink">
                {bootcamp.skill}
              </span>{" "}
              badge is now visible to recruiters.
            </p>
            <Link
              href={`/student/my-bootcamps/${bootcamp.id}/assignment`}
              className="text-xs text-brand-primary font-semibold mt-3 inline-block hover:underline"
            >
              View graded submission →
            </Link>
          </GlassCard>
        )}
      </div>

      {/* ── Right: AI Tutor ──────────────────────────────── */}
      <div className="lg:col-span-3">
        <TutorPanel
          bootcampId={bootcamp.id}
          videoId={activeVideoId}
          videoTitle={activeVideo?.title}
        />
      </div>

      {/* ── Skill Check Modal ───────────────────────────── */}
      {skillCheckOpen && activeVideo && (
        <SkillCheckModal
          bootcampId={bootcamp.id}
          videoId={activeVideo.id}
          videoTitle={activeVideo.title}
          onClose={() => setSkillCheckOpen(false)}
          onPassed={() => {
            setSkillCheckOpen(false);
            setProgress((p) => ({
              ...p,
              skillChecksPassed: Array.from(
                new Set([...p.skillChecksPassed, activeVideo.id]),
              ),
            }));
            // Auto-advance to next lesson
            const next = bootcamp.videos[activeIdx + 1];
            if (next) setActiveVideoId(next.id);
          }}
        />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  extra,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  extra?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition border-b-2 ${
        active
          ? "text-brand-primary border-brand-primary"
          : "text-brand-muted border-transparent hover:text-brand-ink"
      }`}
    >
      {icon}
      {label}
      {extra && (
        <span className="text-[10px] text-brand-muted ml-1">({extra})</span>
      )}
    </button>
  );
}
