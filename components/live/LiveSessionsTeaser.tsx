/**
 * LiveSessionsTeaser — landing-page section that surfaces our free live
 * sessions. Server component: one Mongo read, picks ONE of five render
 * states based on what's available right now.
 *
 *   1. LIVE NOW          → status='live' + has youtubeVideoId
 *   2. STARTS SOON       → next session within 24h
 *   3. UPCOMING          → next session 24h-30d away
 *   4. RECENT RECORDING  → last ended session within 7d, has recording
 *   5. NOTHING SCHEDULED → section renders null (hides itself)
 *
 * Drop this anywhere on the landing page — it self-hides when there's
 * nothing to show, so it never leaves an empty hole. All CTAs route to
 * /live (overview) or /live/[code] (specific session); login-gating
 * happens at the destination, not here, so the section is fast for
 * unauthenticated visitors.
 */
import Link from "next/link";
import { listFreeLiveTeaserSessions, type TeaserLiveSession } from "@/server/store";

export async function LiveSessionsTeaser() {
  const sessions = await listFreeLiveTeaserSessions();

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const live = sessions.find(
    (s) => s.status === "live" && s.youtubeVideoId,
  );
  if (live) return <LiveNowCard session={live} />;

  const upcoming = sessions
    .filter(
      (s) =>
        s.status === "scheduled" &&
        s.startsAt &&
        new Date(s.startsAt).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
    );

  const next = upcoming[0];
  if (next) {
    const msAway = new Date(next.startsAt!).getTime() - now;
    if (msAway < day) {
      return <StartsSoonCard session={next} msAway={msAway} />;
    }
    if (msAway < 30 * day) {
      return <UpcomingCard session={next} extras={upcoming.slice(1, 3)} />;
    }
  }

  const recent = sessions
    .filter(
      (s) =>
        s.status === "ended" &&
        (s.youtubeVideoId || s.recordingUrl) &&
        s.endedAt &&
        now - new Date(s.endedAt).getTime() < 7 * day,
    )
    .sort(
      (a, b) =>
        new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime(),
    );
  if (recent[0]) {
    return <RecentRecordingCard session={recent[0]} />;
  }

  // State 5 — nothing to surface. Render nothing so the landing page
  // doesn't get a weird empty slot.
  return null;
}




// ─────────────────────────────────────────────────────────────────────────
//  State 1: LIVE NOW — loudest visual, pulsing dot, attendance encourager
// ─────────────────────────────────────────────────────────────────────────
function LiveNowCard({ session }: { session: TeaserLiveSession }) {
  return (
    <section className="mx-auto max-w-content px-4 py-12">
      <Link
        href={`/live/${session.code}`}
        className="group block rounded-3xl bg-gradient-to-br from-rose-50 to-orange-50 border-2 border-rose-200 p-6 sm:p-8 hover:border-rose-400 transition shadow-sm hover:shadow-lg"
      >
        <div className="flex items-start gap-5 flex-col sm:flex-row sm:items-center">
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold uppercase tracking-wider">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inset-0 rounded-full bg-rose-300 opacity-75" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
              </span>
              Live right now
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-extrabold text-xl sm:text-2xl text-brand-ink">
              {session.title}
            </h3>
            {session.description ? (
              <p className="text-sm text-brand-muted mt-1 line-clamp-2">
                {session.description}
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold group-hover:bg-brand-primary/90 transition shrink-0">
            Watch live →
          </span>
        </div>
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  State 2: STARTS SOON — countdown emphasis
// ─────────────────────────────────────────────────────────────────────────
function StartsSoonCard({
  session,
  msAway,
}: {
  session: TeaserLiveSession;
  msAway: number;
}) {
  const minutes = Math.max(1, Math.floor(msAway / 60_000));
  return (
    <section className="mx-auto max-w-content px-4 py-12">
      <Link
        href={`/live/${session.code}`}
        className="group block rounded-3xl bg-gradient-to-br from-amber-50 to-brand-primary/5 border-2 border-amber-200 p-6 sm:p-8 hover:border-amber-400 transition shadow-sm hover:shadow-lg"
      >
        <div className="flex items-start gap-5 flex-col sm:flex-row sm:items-center">
          <div className="shrink-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 mb-1">
              Next live session
            </p>
            <p className="font-display font-extrabold text-2xl text-amber-700 tnum">
              {formatCountdown(minutes)}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-extrabold text-xl text-brand-ink">
              {session.title}
            </h3>
            {session.description ? (
              <p className="text-sm text-brand-muted mt-1 line-clamp-2">
                {session.description}
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold group-hover:bg-brand-primary/90 transition shrink-0">
            Reserve your spot →
          </span>
        </div>
      </Link>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  State 3: UPCOMING — calm, with 1-2 follow-up sessions stacked
// ─────────────────────────────────────────────────────────────────────────
function UpcomingCard({
  session,
  extras,
}: {
  session: TeaserLiveSession;
  extras: TeaserLiveSession[];
}) {
  return (
    <section className="mx-auto max-w-content px-4 py-12">
      <div className="rounded-3xl bg-white border border-brand-ink/10 p-6 sm:p-8 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest font-bold text-brand-muted mb-3">
          Free live sessions coming up
        </p>
        <Link
          href={`/live/${session.code}`}
          className="group block py-3 border-b border-brand-ink/5"
        >
          <div className="flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-lg text-brand-ink group-hover:text-brand-primary transition truncate">
                {session.title}
              </h3>
              <p className="text-xs text-brand-muted mt-0.5 tnum">
                {session.startsAt
                  ? new Date(session.startsAt).toLocaleString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-primary shrink-0">
              Details →
            </span>
          </div>
        </Link>
        {extras.map((s) => (
          <Link
            key={s.code}
            href={`/live/${s.code}`}
            className="group block py-3 border-b border-brand-ink/5 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-ink/80 group-hover:text-brand-primary transition truncate">
                  {s.title}
                </p>
                <p className="text-[11px] text-brand-muted tnum">
                  {s.startsAt
                    ? new Date(s.startsAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}
        <div className="mt-4 text-center">
          <Link
            href="/live"
            className="text-xs font-semibold text-brand-primary hover:underline"
          >
            See all sessions →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  State 4: RECENT RECORDING — "missed it? catch up"
// ─────────────────────────────────────────────────────────────────────────
function RecentRecordingCard({ session }: { session: TeaserLiveSession }) {
  return (
    <section className="mx-auto max-w-content px-4 py-12">
      <Link
        href={`/live/${session.code}`}
        className="group block rounded-3xl bg-white border border-brand-ink/10 p-6 sm:p-8 hover:border-brand-primary/30 transition shadow-sm hover:shadow-lg"
      >
        <div className="flex items-start gap-5 flex-col sm:flex-row sm:items-center">
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-ink/[0.05] text-brand-ink text-[11px] font-semibold">
              📺 Recent recording
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-xl text-brand-ink">
              {session.title}
            </h3>
            <p className="text-xs text-brand-muted mt-1">
              Missed our last session? Watch the recording any time.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary/30 text-brand-primary px-5 py-2.5 text-sm font-semibold group-hover:bg-brand-primary/5 transition shrink-0">
            Watch recording →
          </span>
        </div>
      </Link>
    </section>
  );
}

function formatCountdown(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
