import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Star,
  TrendingUp,
  Users as UsersIcon,
  Video,
} from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import {
  computeInstructorMetrics,
  getUserById,
  listBootcampsByInstructor,
} from "@/server/store";

const CATEGORY_LABEL: Record<string, string> = {
  ai: "AI / GenAI",
  data_science: "Data Science",
  marketing: "Marketing",
  finance: "Finance",
  sales: "Sales / BD",
};

export default async function InstructorPublicProfile({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUserById(params.id);
  if (!user || user.role !== "instructor") notFound();

  const [bcs, metrics] = await Promise.all([
    listBootcampsByInstructor(params.id),
    computeInstructorMetrics(params.id),
  ]);

  const upcomingSlots = bcs
    .flatMap((b) =>
      (b.liveSlots ?? []).map((iso) => ({
        iso,
        bootcampTitle: b.title,
        bootcampId: b.id,
      })),
    )
    .filter((s) => new Date(s.iso).getTime() > Date.now())
    .sort(
      (a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime(),
    )
    .slice(0, 4);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <Link
          href="/bootcamps"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-5"
        >
          <ArrowLeft size={14} /> Back to bootcamps
        </Link>

        {/* ── Hero ──────────────────────────────────────────────── */}
        <GlassCard variant="strong" className="!p-7 mb-6">
          <div className="flex items-start justify-between gap-5 flex-wrap">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className="grid place-items-center w-16 h-16 rounded-2xl bg-brand-gradient text-white shadow-brand-glow font-display font-extrabold text-2xl shrink-0">
                {user.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <GlassBadge tone="warn">
                    <BookOpen size={11} /> Instructor
                  </GlassBadge>
                  <GlassBadge tone="success">
                    <CheckCircle2 size={10} /> Verified
                  </GlassBadge>
                  <span className="inline-flex items-center gap-1 text-sm text-amber-600 font-semibold">
                    <Star size={13} fill="currentColor" />
                    {metrics.avgRating.toFixed(2)}
                  </span>
                </div>
                <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink">
                  {user.name}
                </h1>
                <p className="text-sm text-brand-muted mt-2 leading-relaxed max-w-2xl">
                  {bcs[0]?.skill
                    ? `Teaching ${[...new Set(bcs.map((b) => b.skill))]
                        .slice(0, 3)
                        .join(" · ")} on unGhost.`
                    : "Independent instructor on unGhost."}{" "}
                  Curated by admin · contracts negotiated individually · all
                  content reviewed before going live.
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                Students taught
              </p>
              <p className="font-display font-extrabold text-2xl text-brand-primary">
                {metrics.totalEnrolled}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* ── Stats strip ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Kpi
            icon={<GraduationCap size={14} />}
            label="Bootcamps"
            value={metrics.totalBootcamps}
            tone="brand"
          />
          <Kpi
            icon={<UsersIcon size={14} />}
            label="Students"
            value={metrics.totalEnrolled}
            tone="brand"
          />
          <Kpi
            icon={<Star size={14} />}
            label="Avg rating"
            value={metrics.avgRating ? metrics.avgRating.toFixed(2) : "—"}
            tone="warn"
          />
          <Kpi
            icon={<Video size={14} />}
            label="Live sessions"
            value={`${metrics.upcomingLiveSlots} upcoming`}
            tone="success"
          />
        </div>

        {/* ── Active bootcamps ──────────────────────────────────── */}
        {bcs.length > 0 ? (
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
              <Sparkles size={11} /> Currently teaching
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {bcs.map((b) => (
                <Link
                  key={b.id}
                  href={`/bootcamp/${b.id}`}
                  className="block rounded-2xl bg-white/55 backdrop-blur-xl border border-white/60 shadow-glass p-4 hover:-translate-y-0.5 hover:shadow-glass-hover transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <GlassBadge tone="warn">
                      {CATEGORY_LABEL[b.category] ?? b.skill}
                    </GlassBadge>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                      <Star size={11} fill="currentColor" /> {b.rating}
                    </span>
                  </div>
                  <p className="font-display font-bold text-base text-brand-ink line-clamp-1">
                    {b.title}
                  </p>
                  <p className="text-xs text-brand-muted line-clamp-2 mt-1">
                    {b.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-brand-muted mt-3 pt-3 border-t border-brand-ink/5">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon size={10} /> {b.enrolledStudentIds.length}{" "}
                      enrolled
                    </span>
                    <span className="text-[11px] font-semibold text-violet-700 inline-flex items-center gap-1">
                      ✦ Premium
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <GlassCard className="text-center !py-10 mb-6">
            <p className="text-sm text-brand-muted">
              No active bootcamps right now. Check back as new cohorts open.
            </p>
          </GlassCard>
        )}

        {/* ── Upcoming live sessions ────────────────────────────── */}
        {upcomingSlots.length > 0 && (
          <GlassCard className="mb-6">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
              <Calendar size={11} /> Upcoming live sessions
            </p>
            <ul className="space-y-2">
              {upcomingSlots.map((s) => (
                <li
                  key={s.iso + s.bootcampId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/40 border border-brand-ink/5 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
                      Live · {s.bootcampTitle}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {new Date(s.iso).toLocaleString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · 60-min live session
                    </p>
                  </div>
                  <Link
                    href={`/bootcamp/${s.bootcampId}`}
                    className="text-xs font-semibold text-brand-primary hover:underline shrink-0"
                  >
                    RSVP →
                  </Link>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {/* ── Reviews placeholder ───────────────────────────────── */}
        <GlassCard className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Award size={11} /> Recent student feedback
          </p>
          {metrics.totalReviews > 0 ? (
            <div className="space-y-3">
              <ReviewQuote
                quote={`${user.name.split(" ")[0]} doesn't dumb things down — they get you to the trade-offs by the second video. Verified Skill paid for itself.`}
                author="Anonymous student"
                stars={5}
              />
              <ReviewQuote
                quote={`Live session was tighter than any university course I've taken. Worth the price purely for the worked example.`}
                author="Anonymous student"
                stars={5}
              />
              <ReviewQuote
                quote={`The skill checks were strict — I failed once and the rewatch timestamps were spot-on. Passed second try.`}
                author="Anonymous student"
                stars={4}
              />
            </div>
          ) : (
            <p className="text-sm text-brand-muted text-center py-4">
              No reviews yet — be the first cohort.
            </p>
          )}
        </GlassCard>

        <p className="text-[11px] text-brand-muted text-center">
          Every instructor on unGhost is invite-only · profile + work portfolio
          reviewed before going live. Bootcamps must pass admin review before
          publishing.
        </p>
      </div>
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "brand" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-rose-600"
      : "text-brand-primary";
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
    </GlassCard>
  );
}

function ReviewQuote({
  quote,
  author,
  stars,
}: {
  quote: string;
  author: string;
  stars: number;
}) {
  return (
    <div className="rounded-2xl bg-white/50 border border-brand-ink/5 p-4">
      <div className="flex items-center gap-0.5 mb-2">
        {Array.from({ length: stars }).map((_, i) => (
          <Star
            key={i}
            size={11}
            fill="currentColor"
            className="text-amber-500"
          />
        ))}
      </div>
      <p className="text-sm text-brand-ink/90 leading-relaxed italic">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="text-[11px] text-brand-muted mt-2">— {author}</p>
    </div>
  );
}
