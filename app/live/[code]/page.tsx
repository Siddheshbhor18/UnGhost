/**
 * /live/[code] — public live-session viewing page.
 *
 * Routes to one of TWO renderers based on the session document:
 *
 *   A. YouTube + in-platform chat ("YouTubeLiveView")
 *      ── used by all free lead-gen webinars + any session where the
 *         admin has pasted a `youtubeVideoId`. This is the new path
 *         (introduced 2026-05) — instructor broadcasts via OBS to
 *         YouTube Live, we iframe-embed the chrome-stripped player
 *         alongside our own Socket.IO-/polling-backed chat.
 *
 *   B. LiveRoom (100ms-based) — legacy renderer kept for any session
 *      created before the YouTube switchover that has no `youtubeVideoId`
 *      yet. Will be deleted once those sessions are migrated/archived.
 *
 * Auth gate: must be logged in (chat needs an identity for moderation +
 * lead capture). Unauthenticated users are bounced to /login.
 */
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth";
import { connectMongo } from "@/server/db/mongo";
import { LiveSessionModel } from "@/server/db/models";
import {
  getBootcampById,
  getLiveSessionByCode,
  getUserById,
  recordLiveAttendance,
} from "@/server/store";
import { LiveRoom } from "@/components/live/LiveRoom";
import { LiveChat } from "@/components/live/LiveChat";
import { BlobField, GlassBadge, GlassCard } from "@/components/glass";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { code: string };
}

export default async function LiveRoomPage({ params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?next=/live/${params.code}`);

  await connectMongo();
  const live = await LiveSessionModel.findOne({
    roomCode: params.code,
  }).lean();

  if (!live) {
    return (
      <main className="relative min-h-screen grid place-items-center px-4">
        <BlobField />
        <GlassCard className="max-w-md text-center !p-8">
          <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-brand-gradient shadow-brand-glow mb-4">
            <img
              src="/symbol.svg"
              alt="unGhost"
              width={34}
              height={34}
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink">
            Room not found
          </h1>
          <p className="text-sm text-brand-muted mt-2">
            The room code <span className="font-mono">{params.code}</span>{" "}
            doesn&apos;t exist or the session was cancelled.
          </p>
          <Link href="/live" className="btn-brand mt-5 inline-flex">
            ← All live sessions
          </Link>
        </GlassCard>
      </main>
    );
  }

  // ── Branch A: YouTube + chat (new path) ────────────────────────────────
  // Trigger conditions:
  //   • tier === "free"  → always YouTube/chat (lead-gen webinars)
  //   • youtubeVideoId present → admin opted into YouTube even for paid
  // Otherwise fall through to the legacy 100ms LiveRoom.
  const useYouTubePath =
    live.tier === "free" || Boolean(live.youtubeVideoId);

  if (useYouTubePath) {
    return (
      <YouTubeLiveView
        live={{
          // Normalise _id to string — mongoose .lean() leaves ObjectId
          // typed even though the schema declares String.
          _id: String(live._id),
          title: live.title ?? "Untitled session",
          description: live.description,
          status: live.status,
          instructorId: live.instructorId,
          startsAt: live.startsAt,
          youtubeVideoId: live.youtubeVideoId,
          recordingUrl: live.recordingUrl,
          tier: live.tier,
        }}
        currentUserId={String(session.user.id)}
        currentUserName={session.user.name ?? "You"}
        isAdmin={session.user.role === "admin"}
        roomCode={params.code}
      />
    );
  }

  // ── Branch B: legacy 100ms LiveRoom ────────────────────────────────────
  if (live.status === "ended" || live.status === "cancelled") {
    return (
      <main className="relative min-h-screen grid place-items-center px-4">
        <BlobField />
        <GlassCard className="max-w-md text-center !p-8">
          <GlassBadge tone={live.status === "ended" ? "neutral" : "warn"}>
            {live.status === "ended" ? "Session ended" : "Cancelled"}
          </GlassBadge>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
            {live.title}
          </h1>
          <p className="text-sm text-brand-muted mt-2">
            {live.status === "ended"
              ? `This room closed at ${new Date(live.endedAt ?? live.startsAt!).toLocaleString()}.`
              : "Instructor cancelled this session."}
          </p>
          {live.recordingUrl && (
            <a href={live.recordingUrl} className="btn-brand mt-5 inline-flex">
              Watch recording
            </a>
          )}
          <Link
            href={
              session.user.role === "instructor"
                ? "/instructor/live"
                : "/student/live"
            }
            className="btn-glass mt-3 inline-flex"
          >
            ← Back
          </Link>
        </GlassCard>
      </main>
    );
  }

  const isInstructor = session.user.id === live.instructorId;
  if (!isInstructor && live.status === "scheduled") {
    return (
      <main className="relative min-h-screen grid place-items-center px-4">
        <BlobField />
        <GlassCard className="max-w-md text-center !p-8">
          <GlassBadge tone="brand">Not started yet</GlassBadge>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
            {live.title}
          </h1>
          <p className="text-sm text-brand-muted mt-2">
            Instructor hasn&apos;t opened the room yet. Try again at{" "}
            <span className="font-semibold text-brand-ink">
              {new Date(live.startsAt!).toLocaleString()}
            </span>
            .
          </p>
          <Link href="/student/live" className="btn-glass mt-5 inline-flex">
            ← Back to lobby
          </Link>
        </GlassCard>
      </main>
    );
  }

  // Use the legacy store helpers for the legacy path so we don't fight the
  // shape mismatch between mongoose docs + shared types.
  const legacyLive = await getLiveSessionByCode(params.code);
  if (!legacyLive) notFound();

  if (!isInstructor && legacyLive.status === "live") {
    await recordLiveAttendance(legacyLive.id, session.user.id);
  }

  const [bootcamp, user] = await Promise.all([
    legacyLive.bootcampId ? getBootcampById(legacyLive.bootcampId) : null,
    getUserById(session.user.id),
  ]);
  const myName =
    user?.profile?.alias ?? user?.name?.split(" ")[0] ?? "Guest";

  return (
    <LiveRoom
      sessionId={legacyLive.id}
      roomCode={legacyLive.roomCode}
      title={legacyLive.title}
      bootcampTitle={bootcamp?.title ?? "Bootcamp"}
      isInstructor={isInstructor}
      myName={myName}
      participantCount={legacyLive.attendedStudentIds.length + 1}
      status={legacyLive.status}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  YouTubeLiveView — the new path. Renders one of 4 panel states beside
//  the persistent chat sidebar.
// ─────────────────────────────────────────────────────────────────────────
interface YTViewProps {
  live: {
    _id: string;
    title: string;
    description?: string;
    status?: string;
    instructorId?: string;
    startsAt?: string;
    youtubeVideoId?: string | null;
    recordingUrl?: string;
    tier?: string;
  };
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
  roomCode: string;
}

function YouTubeLiveView({
  live,
  currentUserId,
  isAdmin,
  roomCode,
}: YTViewProps) {
  const isInstructor = currentUserId === live.instructorId;
  const isModerator = isAdmin || isInstructor;
  const isEnded = live.status === "ended" || live.status === "cancelled";
  const hasVideoId = Boolean(live.youtubeVideoId);
  const hasRecording = Boolean(live.recordingUrl || (isEnded && hasVideoId));

  const variant: "live" | "soon" | "ended-recording" | "ended-no-recording" =
    isEnded
      ? hasRecording
        ? "ended-recording"
        : "ended-no-recording"
      : hasVideoId
        ? "live"
        : "soon";

  const minutesUntilStart = live.startsAt
    ? Math.max(
        0,
        Math.floor(
          (new Date(live.startsAt).getTime() - Date.now()) / 60_000,
        ),
      )
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-ink/[0.02] via-white to-brand-primary/[0.04]">
      <header className="border-b border-brand-ink/10 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="font-display font-bold text-brand-ink hover:opacity-80 transition"
          >
            un<span className="logo-sweep">Ghost</span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            {variant === "live" ? <LivePulse /> : null}
            <Link
              href="/live"
              className="text-brand-muted hover:text-brand-ink transition"
            >
              All sessions
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-brand-muted mb-1">
            {live.tier === "paid"
              ? "Paid Bootcamp Session"
              : "Free Live Session"}
          </p>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-ink">
            {live.title}
          </h1>
          {live.description ? (
            <p className="text-sm text-brand-muted mt-1 max-w-3xl">
              {live.description}
            </p>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4 lg:h-[calc(100vh-220px)]">
          <div className="rounded-2xl overflow-hidden border border-brand-ink/10 bg-brand-ink/95 aspect-video lg:aspect-auto min-h-[360px]">
            {variant === "live" || variant === "ended-recording" ? (
              <YouTubeFrame videoId={live.youtubeVideoId!} />
            ) : variant === "soon" ? (
              <StartingSoonPanel
                title={live.title}
                minutesUntilStart={minutesUntilStart}
                startsAt={live.startsAt}
              />
            ) : (
              <RecordingPendingPanel />
            )}
          </div>

          <div className="min-h-[420px] lg:min-h-0 lg:h-full">
            <LiveChat
              roomCode={roomCode}
              canChat={!isEnded}
              currentUserId={currentUserId}
              isModerator={isModerator}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/** Chrome-stripped YouTube embed. youtube-nocookie domain = no tracking
 *  cookies set until the user actually presses play. modestbranding=1 +
 *  rel=0 strip the YouTube logo + post-roll suggested videos. */
function YouTubeFrame({ videoId }: { videoId: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&modestbranding=1&rel=0&controls=1&fs=1&playsinline=1`;
  return (
    <iframe
      src={src}
      title="Live stream"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      className="w-full h-full border-0"
    />
  );
}

function StartingSoonPanel({
  title,
  minutesUntilStart,
  startsAt,
}: {
  title: string;
  minutesUntilStart: number | null;
  startsAt?: string;
}) {
  return (
    <div className="h-full w-full grid place-items-center text-white text-center p-8">
      <div>
        <div className="mx-auto w-16 h-16 rounded-full bg-white/10 grid place-items-center mb-4">
          <span className="text-3xl">📡</span>
        </div>
        <p className="text-xs uppercase tracking-widest font-semibold opacity-70 mb-1">
          Starting soon
        </p>
        <h2 className="font-display font-bold text-xl mb-3">{title}</h2>
        {minutesUntilStart !== null && minutesUntilStart > 0 ? (
          <p className="text-sm opacity-90">
            Stream begins in <strong>{formatCountdown(minutesUntilStart)}</strong>
          </p>
        ) : (
          <p className="text-sm opacity-90">
            We&apos;re about to go live. Keep this tab open.
          </p>
        )}
        {startsAt ? (
          <p className="text-xs opacity-60 mt-2 tnum">
            {new Date(startsAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RecordingPendingPanel() {
  return (
    <div className="h-full w-full grid place-items-center text-white text-center p-8">
      <div>
        <div className="mx-auto w-16 h-16 rounded-full bg-white/10 grid place-items-center mb-4">
          <span className="text-3xl">🎬</span>
        </div>
        <p className="text-xs uppercase tracking-widest font-semibold opacity-70 mb-1">
          Session ended
        </p>
        <h2 className="font-display font-bold text-xl mb-2">
          Recording coming soon
        </h2>
        <p className="text-sm opacity-90">
          We&apos;ll post the recording here once it&apos;s processed.
        </p>
      </div>
    </div>
  );
}

function LivePulse() {
  return (
    <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold text-[11px] uppercase tracking-wider">
      <span className="relative flex w-2 h-2">
        <span className="animate-ping absolute inset-0 rounded-full bg-rose-400 opacity-75" />
        <span className="relative inline-flex w-2 h-2 rounded-full bg-rose-500" />
      </span>
      Live now
    </span>
  );
}

function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
