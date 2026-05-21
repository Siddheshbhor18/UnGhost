/**
 * /live — public schedule of all live sessions + past recordings.
 *
 * Anyone can browse this page (no auth gate) so it serves as a marketing
 * surface for free webinars. Click-through to /live/[code] requires login.
 *
 * Layout: 3 sections, in order of urgency.
 *   1. LIVE NOW (status='live' AND tier='free')
 *   2. UPCOMING (status='scheduled' AND startsAt > now, next 30 days)
 *   3. RECORDINGS (status='ended' AND has video, last 90 days)
 *
 * Only free-tier sessions appear publicly. Paid bootcamp sessions are
 * surfaced inside the bootcamp page for enrolled students only.
 */
import Link from "next/link";
import { connectMongo } from "@/server/db/mongo";
import { LiveSessionModel } from "@/server/db/models";

export const dynamic = "force-dynamic";

interface SessionRow {
  code: string;
  title: string;
  description?: string;
  startsAt?: string;
  status: string;
  hasVideo: boolean;
}

export default async function LiveLandingPage() {
  await connectMongo();

  const all = await LiveSessionModel.find({
    tier: "free",
    status: { $in: ["scheduled", "live", "ended"] },
  })
    .sort({ startsAt: 1 })
    .limit(50)
    .lean();

  const now = Date.now();
  const liveNow: SessionRow[] = [];
  const upcoming: SessionRow[] = [];
  const recordings: SessionRow[] = [];

  for (const s of all) {
    const row: SessionRow = {
      code: s.roomCode!,
      title: s.title ?? "Untitled session",
      description: s.description,
      startsAt: s.startsAt,
      status: s.status ?? "scheduled",
      hasVideo: Boolean(s.youtubeVideoId || s.recordingUrl),
    };
    if (s.status === "live" && s.youtubeVideoId) {
      liveNow.push(row);
    } else if (
      s.status === "scheduled" &&
      s.startsAt &&
      new Date(s.startsAt).getTime() > now
    ) {
      upcoming.push(row);
    } else if (s.status === "ended" && row.hasVideo) {
      // Recently-ended within 90 days; older drops off.
      if (
        s.startsAt &&
        new Date(s.startsAt).getTime() > now - 90 * 24 * 60 * 60 * 1000
      ) {
        recordings.push(row);
      }
    }
  }
  recordings.reverse(); // newest first

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-ink/[0.02] via-white to-brand-primary/[0.04]">
      <header className="border-b border-brand-ink/10 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="font-display font-bold text-brand-ink hover:opacity-80 transition"
          >
            un<span className="logo-sweep">Ghost</span>
          </Link>
          <Link
            href="/signup"
            className="text-xs font-semibold text-brand-primary hover:underline"
          >
            Sign up →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-10">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-brand-muted mb-2">
            Free live sessions
          </p>
          <h1 className="font-display font-extrabold text-4xl text-brand-ink">
            Learn live with industry experts.
          </h1>
          <p className="text-sm text-brand-muted mt-2 max-w-2xl">
            Free webinars from instructors who&apos;ve actually shipped. Watch
            live, ask questions in chat, or catch the recording.
          </p>
        </header>

        {liveNow.length > 0 ? (
          <Section title="🔴 Live right now" highlight>
            {liveNow.map((s) => (
              <SessionCard key={s.code} session={s} variant="live" />
            ))}
          </Section>
        ) : null}

        <Section title="Upcoming sessions">
          {upcoming.length === 0 ? (
            <EmptyState message="No sessions scheduled yet. Check back soon." />
          ) : (
            upcoming.map((s) => (
              <SessionCard key={s.code} session={s} variant="upcoming" />
            ))
          )}
        </Section>

        {recordings.length > 0 ? (
          <Section title="Recent recordings">
            {recordings.map((s) => (
              <SessionCard key={s.code} session={s} variant="recording" />
            ))}
          </Section>
        ) : null}
      </div>
    </main>
  );
}

function Section({
  title,
  highlight,
  children,
}: {
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2
        className={
          highlight
            ? "font-display font-bold text-xl text-rose-600 mb-3"
            : "font-display font-bold text-xl text-brand-ink mb-3"
        }
      >
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SessionCard({
  session,
  variant,
}: {
  session: SessionRow;
  variant: "live" | "upcoming" | "recording";
}) {
  const cta =
    variant === "live"
      ? "Watch live →"
      : variant === "upcoming"
        ? "Set a reminder →"
        : "Watch recording →";
  const accent =
    variant === "live"
      ? "border-rose-300 bg-rose-50/60 hover:border-rose-400"
      : variant === "upcoming"
        ? "border-brand-primary/20 bg-brand-primary/[0.04] hover:border-brand-primary/40"
        : "border-brand-ink/10 bg-white hover:border-brand-ink/25";
  return (
    <Link
      href={`/live/${session.code}`}
      className={`block rounded-2xl border p-5 transition ${accent}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-brand-ink text-base">
            {session.title}
          </h3>
          {session.description ? (
            <p className="text-sm text-brand-muted mt-1 line-clamp-2">
              {session.description}
            </p>
          ) : null}
          {session.startsAt ? (
            <p className="text-[11px] text-brand-muted mt-2 tnum">
              {new Date(session.startsAt).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : null}
        </div>
        <span className="text-xs font-semibold text-brand-primary shrink-0">
          {cta}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-ink/15 bg-brand-ink/[0.02] p-8 text-center">
      <p className="text-sm text-brand-muted">{message}</p>
    </div>
  );
}
