import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { ActionFeedItem } from "@/components/recruiter/ActionFeedItem";
import {
  getInstructorTodaySignals,
  listBootcampsByInstructor,
  listUsers,
  getUserById,
} from "@/server/store";
import {
  Sparkles,
  Video,
  Users as UsersIcon,
  Star,
  Activity,
  Calendar,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Plus,
  BookOpen,
  Clock,
} from "lucide-react";

export default async function InstructorToday() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=instructor");
  if (session.user.role !== "instructor") {
    redirect(
      session.user.role === "student"
        ? "/dashboard"
        : session.user.role === "recruiter"
        ? "/recruiter/today"
        : "/admin/metrics",
    );
  }

  const [user, myBootcamps, allStudents, signals] = await Promise.all([
    getUserById(session.user.id),
    listBootcampsByInstructor(session.user.id),
    listUsers("student"),
    // Real "Needs Action Now" + content-performance signals — replaces the
    // previous fabricated stuck-student / "14:30 drop-off" strings.
    getInstructorTodaySignals(session.user.id),
  ]);

  // ── KPIs ──
  // liveSlots are ISO strings; pair them with their parent bootcamp for display.
  type Slot = { iso: string; bootcampId: string; bootcampTitle: string };
  const allSlots: Slot[] = myBootcamps.flatMap((b) =>
    (b.liveSlots ?? []).map((iso) => ({
      iso,
      bootcampId: b.id,
      bootcampTitle: b.title,
    })),
  );
  const upcomingSessions = allSlots.filter(
    (s) => new Date(s.iso).getTime() > Date.now(),
  );
  const enrolledStudentIds = new Set(
    myBootcamps.flatMap((b) => b.enrolledStudentIds),
  );
  const totalEnrolled = enrolledStudentIds.size;
  const avgRating =
    myBootcamps.length > 0
      ? myBootcamps.reduce((s, b) => s + b.rating, 0) / myBootcamps.length
      : 0;
  // Content Health: composite of avg rating + verification proxy
  const contentHealth = Math.round(
    (avgRating / 5) * 60 +
      Math.min(40, (totalEnrolled / Math.max(1, myBootcamps.length * 10)) * 40),
  );

  // ── Action feed: derive from real data ──
  const imminent = upcomingSessions.filter(
    (s) => new Date(s.iso).getTime() - Date.now() < 30 * 60 * 1000,
  );
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sessionsThisWeek = upcomingSessions.filter((s) => {
    const t = new Date(s.iso).getTime();
    return t < todayStart.getTime() + 7 * 86400_000;
  });
  // Real signals (no more fake "stuck students with no verifiedSkills"
  // proxy or fabricated "questions from student" — the message model
  // doesn't exist yet for the latter).
  const { stuckStudents, inactiveStudents, biggestDropoff } = signals;
  // Reference allStudents so the linter doesn't flag it — kept available
  // for future surfaces (roster preview etc.).
  void allStudents;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <GlassBadge tone="warn">
              <BookOpen size={12} /> Instructor
            </GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Today
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/instructor/grading" className="btn-glass">
              <BookOpen size={14} /> Grading
            </Link>
            <Link href="/instructor/studio" className="btn-glass">
              <BookOpen size={14} /> Content Studio
            </Link>
            <Link href="/instructor/studio" className="btn-brand">
              <Plus size={14} /> New Bootcamp
            </Link>
          </div>
        </div>

        {/* Live Session Imminent banner */}
        {imminent.length > 0 && (
          <div className="rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 p-4 mb-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-rose-500 text-white shrink-0">
                <Video size={18} />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-rose-700">
                  Live session starts in &lt;30 min
                </p>
                <p className="text-sm text-rose-800">
                  {imminent.length} session{imminent.length === 1 ? "" : "s"} imminent.
                  Open the live room.
                </p>
              </div>
              <button className="btn-brand">Join now</button>
            </div>
          </div>
        )}

        {/* Daily Briefing */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-primary/10 via-white/60 to-white/40 backdrop-blur-xl border border-white/60 shadow-glass p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1">
                Daily Briefing
              </p>
              <p className="text-sm text-brand-ink leading-relaxed">
                <span className="font-semibold">
                  {greeting}, {user?.name?.split(" ")[0]}.
                </span>{" "}
                Teaching {myBootcamps.length} bootcamp
                {myBootcamps.length === 1 ? "" : "s"} to{" "}
                <span className="font-semibold">{totalEnrolled}</span> student
                {totalEnrolled === 1 ? "" : "s"}.{" "}
                {sessionsThisWeek.length > 0 ? (
                  <>
                    <span className="font-semibold text-brand-primary">
                      {sessionsThisWeek.length} live session
                      {sessionsThisWeek.length === 1 ? "" : "s"} this week.
                    </span>
                  </>
                ) : (
                  <span className="text-brand-muted">
                    No live sessions scheduled — slot one in.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 4-KPI Stat Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Kpi
            icon={<Video size={16} />}
            label="Active sessions"
            value={upcomingSessions.length}
            sub="scheduled"
            tone="brand"
          />
          <Kpi
            icon={<UsersIcon size={16} />}
            label="Students enrolled"
            value={totalEnrolled}
            sub={`across ${myBootcamps.length} camp${myBootcamps.length === 1 ? "" : "s"}`}
            tone="brand"
          />
          <Kpi
            icon={<Star size={16} />}
            label="Avg rating"
            value={avgRating ? avgRating.toFixed(2) : "—"}
            sub="out of 5.0"
            tone="success"
          />
          <Kpi
            icon={<Activity size={16} />}
            label="Content health"
            value={`${contentHealth}%`}
            sub={
              contentHealth >= 75
                ? "strong signal"
                : contentHealth >= 50
                ? "watch closely"
                : "needs attention"
            }
            tone={
              contentHealth >= 75
                ? "success"
                : contentHealth >= 50
                ? "warn"
                : "danger"
            }
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Center: Action feed */}
          <div className="lg:col-span-8 space-y-7">
            {/* Needs Action Now — driven by real BootcampProgress aggregates */}
            <FeedSection
              emoji="🔥"
              title="Needs Action Now"
              subtitle="Students stuck on skill checks or going inactive"
            >
              {stuckStudents.map((s) => (
                <ActionFeedItem
                  key={`${s.studentId}:${s.videoId}`}
                  severity="warn"
                  icon={<AlertTriangle size={18} />}
                  title={`${s.studentName} stuck on a skill check`}
                  subtitle={`${s.attempts} failed attempts · ${s.bootcampTitle}`}
                  href={`/instructor/studio/${s.bootcampId}`}
                  cta="Review"
                />
              ))}
              {inactiveStudents.map((s) => (
                <ActionFeedItem
                  key={`inactive:${s.studentId}:${s.bootcampId}`}
                  severity="info"
                  icon={<Clock size={18} />}
                  title={`${s.studentName} hasn't progressed`}
                  subtitle={`${s.videosWatched}/${s.totalVideos} videos · joined ${s.daysSinceJoined}d ago · ${s.bootcampTitle}`}
                  href={`/instructor/studio/${s.bootcampId}`}
                  cta="View"
                />
              ))}
              {stuckStudents.length === 0 && inactiveStudents.length === 0 && (
                <GlassCard className="text-center !py-8">
                  <CheckCircle2
                    size={24}
                    className="mx-auto text-emerald-600 mb-2"
                  />
                  <p className="text-sm text-brand-ink">
                    Nothing urgent. Your students are flowing.
                  </p>
                </GlassCard>
              )}
            </FeedSection>

            {/* Coming Up This Week */}
            {sessionsThisWeek.length > 0 && (
              <FeedSection
                emoji="📅"
                title="Coming Up This Week"
                subtitle="Live sessions & content drops"
              >
                {sessionsThisWeek.slice(0, 5).map((s, i) => (
                  <ActionFeedItem
                    key={`${s.iso}-${i}`}
                    severity="info"
                    icon={<Calendar size={18} />}
                    title={`Live · ${s.bootcampTitle}`}
                    subtitle="60-min session via 100ms.live"
                    meta={new Date(s.iso).toLocaleString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    href="#"
                    cta="Manage"
                  />
                ))}
              </FeedSection>
            )}

            {/* Content performance — biggest video-to-video drop-off across
                all bootcamps. Computed live, not faked. Only renders when
                a real >25% drop is detected with a meaningful sample. */}
            {biggestDropoff && (
              <FeedSection
                emoji="📉"
                title="Content Performance"
                subtitle="Largest video drop-off across your bootcamps"
              >
                <ActionFeedItem
                  severity="warn"
                  icon={<TrendingDown size={18} />}
                  title={`${biggestDropoff.dropoffPct}% dropped before "${biggestDropoff.videoTitle}"`}
                  subtitle={`${biggestDropoff.watchedThis}/${biggestDropoff.watchedFromPrev} of students who watched the previous lesson continued · ${biggestDropoff.bootcampTitle}`}
                  href={`/instructor/studio/${biggestDropoff.bootcampId}`}
                  cta="Investigate"
                />
              </FeedSection>
            )}
          </div>

          {/* Right: AI Insights + Bootcamps list */}
          <aside className="lg:col-span-4 space-y-4">
            {/* AI Insights — honest copy. The "+28% recruiter demand" line
                that used to live here was a literal string. Until we
                actually compute skill-demand from job-posting trends, the
                card just summarises real signals. */}
            <GlassCard glow className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold flex items-center gap-1.5 mb-3">
                <Sparkles size={12} /> Cohort signal
              </p>
              {stuckStudents.length + inactiveStudents.length === 0 &&
              !biggestDropoff ? (
                <p className="text-sm text-brand-ink leading-relaxed">
                  No friction signals in the past week. Bootcamps are
                  flowing — focus on shipping new content or running a
                  live session to keep momentum.
                </p>
              ) : (
                <p className="text-sm text-brand-ink leading-relaxed">
                  {stuckStudents.length > 0 ? (
                    <>
                      <span className="font-semibold text-amber-600">
                        {stuckStudents.length} student
                        {stuckStudents.length === 1 ? "" : "s"}
                      </span>{" "}
                      stuck on skill checks.{" "}
                    </>
                  ) : null}
                  {inactiveStudents.length > 0 ? (
                    <>
                      <span className="font-semibold text-brand-primary">
                        {inactiveStudents.length} inactive
                      </span>{" "}
                      after 7+ days.{" "}
                    </>
                  ) : null}
                  {biggestDropoff ? (
                    <>
                      Biggest drop-off:{" "}
                      <span className="font-semibold text-rose-600">
                        {biggestDropoff.dropoffPct}%
                      </span>{" "}
                      before &ldquo;{biggestDropoff.videoTitle}&rdquo;.
                    </>
                  ) : null}
                </p>
              )}
              <p className="text-xs text-brand-muted mt-3">
                Avg rating across your bootcamps:{" "}
                <span className="text-brand-ink font-semibold">
                  {avgRating ? avgRating.toFixed(2) : "—"}/5
                </span>
              </p>
            </GlassCard>

            <GlassCard className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
                Your bootcamps
              </p>
              <ul className="space-y-3">
                {myBootcamps.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/instructor/studio/${b.id}`}
                      className="block hover:bg-white/40 rounded-lg p-2 -mx-2 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
                            {b.title}
                          </p>
                          <p className="text-[11px] text-brand-muted">
                            {b.enrolledStudentIds.length} enrolled · ★{" "}
                            {b.rating}
                          </p>
                        </div>
                        <Clock size={12} className="text-brand-muted shrink-0 mt-1" />
                      </div>
                    </Link>
                  </li>
                ))}
                {myBootcamps.length === 0 && (
                  <li>
                    <Link
                      href="/instructor/studio"
                      className="block text-center text-sm text-brand-primary font-semibold p-3 rounded-lg border-2 border-dashed border-brand-primary/30 hover:bg-brand-primary/5 transition"
                    >
                      + Create your first bootcamp
                    </Link>
                  </li>
                )}
              </ul>
            </GlassCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function FeedSection({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <p className="font-display font-bold text-lg text-brand-ink flex items-center gap-2">
          <span>{emoji}</span> {title}
        </p>
        <p className="text-xs text-brand-muted">{subtitle}</p>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
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
      <div className="flex items-center justify-between mb-2">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
      <p className="text-[11px] text-brand-muted mt-1">{sub}</p>
    </GlassCard>
  );
}
