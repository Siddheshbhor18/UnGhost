/**
 * /admin/live-sessions — list of all live sessions (upcoming + past).
 *
 * Layout: admin sidebar already auth-gates the entire /admin/* tree.
 * Two tables here:
 *   • Active/scheduled — sorted by startsAt ascending (most imminent first)
 *   • Past — most recently ended first, capped at 50
 *
 * Each row links into /admin/live-sessions/[id] for full management
 * (paste video ID, go live, end, cancel).
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { connectMongo } from "@/server/db/mongo";
import { LiveSessionModel } from "@/server/db/models";

export const dynamic = "force-dynamic";

export default async function AdminLiveSessionsPage() {
  await connectMongo();

  const [active, past] = await Promise.all([
    LiveSessionModel.find({ status: { $in: ["scheduled", "live"] } })
      .sort({ startsAt: 1 })
      .limit(50)
      .lean(),
    LiveSessionModel.find({ status: { $in: ["ended", "cancelled"] } })
      .sort({ endedAt: -1, startsAt: -1 })
      .limit(50)
      .lean(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-muted mb-1">
            Operations
          </p>
          <h1 className="font-display font-extrabold text-3xl text-brand-ink">
            Live sessions
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {active.length} active · {past.length} past
          </p>
        </div>
        <Link
          href="/admin/live-sessions/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary text-white px-4 py-2 text-sm font-semibold hover:bg-brand-primary/90 transition shrink-0"
        >
          <Plus size={14} /> New session
        </Link>
      </header>

      <Section title="Active + scheduled" empty="Nothing scheduled. Create one to start.">
        {active.map((s) => (
          <Row key={String(s._id)} session={s} />
        ))}
      </Section>

      <Section title="Past" empty="No past sessions yet.">
        {past.map((s) => (
          <Row key={String(s._id)} session={s} />
        ))}
      </Section>
    </div>
  );
}

interface SessionDoc {
  _id: string | unknown;
  title?: string;
  roomCode?: string;
  status?: string;
  tier?: string;
  startsAt?: string;
  endedAt?: string;
  youtubeVideoId?: string | null;
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) && children.length > 0;
  return (
    <section className="mb-10">
      <h2 className="font-display font-bold text-lg text-brand-ink mb-3">
        {title}
      </h2>
      {hasContent ? (
        <div className="rounded-2xl bg-white/80 border border-brand-ink/10 overflow-hidden">
          {children}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-ink/15 bg-brand-ink/[0.02] p-8 text-center">
          <p className="text-sm text-brand-muted">{empty}</p>
        </div>
      )}
    </section>
  );
}

function Row({ session }: { session: SessionDoc }) {
  const id = String(session._id);
  const status = session.status ?? "scheduled";
  const tone =
    status === "live"
      ? "bg-rose-100 text-rose-700"
      : status === "scheduled"
        ? "bg-amber-100 text-amber-700"
        : status === "ended"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-brand-ink/10 text-brand-muted";
  return (
    <Link
      href={`/admin/live-sessions/${id}`}
      className="block px-4 py-3 border-b border-brand-ink/5 last:border-b-0 hover:bg-brand-ink/[0.02] transition"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tone}`}
            >
              {status}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-brand-muted">
              {session.tier ?? "free"}
            </span>
            {session.youtubeVideoId ? (
              <span className="text-[10px] text-brand-muted">
                · YouTube ID set
              </span>
            ) : null}
          </div>
          <p className="font-semibold text-brand-ink truncate">
            {session.title ?? "(untitled)"}
          </p>
          <p className="text-[11px] text-brand-muted mt-0.5">
            <code className="font-mono">/live/{session.roomCode}</code>
            {session.startsAt
              ? ` · ${new Date(session.startsAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : ""}
          </p>
        </div>
        <span className="text-xs text-brand-primary font-semibold shrink-0">
          Manage →
        </span>
      </div>
    </Link>
  );
}
