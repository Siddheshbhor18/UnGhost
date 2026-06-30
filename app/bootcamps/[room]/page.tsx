import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Layers,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import { GlassNavbar, GlassCard } from "@/components/glass";
import { BackdropMesh, Button, SectionLabel } from "@/components/ui";
import {
  listBootcamps,
  getUserById,
  getUsersByIds,
  listRoomLecturesByRoom,
} from "@/server/store";
import { BootcampGrid } from "@/components/student/BootcampGrid";
import { RoomLockedWall } from "@/components/courses/RoomLockedWall";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import { VideoPlayer } from "@/components/bootcamp/VideoPlayer";
import { getRoom, isRoomId, type BootcampCategory } from "@/shared/rooms";
import { COURSE_CONTENT } from "@/shared/course-content";
import { effectivePlan } from "@/server/lib/quota";
import { PLAN_LIMITS } from "@/shared/types";

export default async function RoomHub({
  params,
}: {
  params: { room: string };
}) {
  if (!isRoomId(params.room)) notFound();
  const room = getRoom(params.room)!;

  const session = await getServerSession(authOptions);
  const [all, lectures] = await Promise.all([
    listBootcamps(),
    listRoomLecturesByRoom(room.id),
  ]);
  // Only surface live cohorts to students; drafts/in-review stay hidden.
  const bcs = all.filter(
    (b) =>
      b.category === room.id && (b.status ?? "published") === "published",
  );

  // Batched instructor fetch — one $in query instead of N round-trips.
  const instructorIds = Array.from(new Set(bcs.map((b) => b.instructorId)));
  const instructorMap = await getUsersByIds(instructorIds);
  const instructorIndex = Object.fromEntries(
    instructorIds.map((id) => [
      id,
      instructorMap.get(id) ? { name: instructorMap.get(id)!.name } : undefined,
    ]),
  );

  let enrolledIds: string[] = [];
  let ownedCourses: BootcampCategory[] = [];
  let allCoursesIncluded = false;
  if (session?.user?.id) {
    const u = await getUserById(session.user.id);
    enrolledIds = u?.profile?.enrolledBootcamps ?? [];
    const nowMs = Date.now();
    ownedCourses = (u?.ownedCourses ?? [])
      .filter((g) => Date.parse(g.expiresAt) > nowMs)
      .map((g) => g.course);
    allCoursesIncluded = u
      ? PLAN_LIMITS[effectivePlan(u)].bootcampsIncluded
      : false;
  }

  const owned = ownedCourses.includes(room.id) || allCoursesIncluded;
  const visual = COURSE_VISUAL[room.id];
  const { tagline, curriculum } = COURSE_CONTENT[room.id];
  const Icon = visual.icon;

  return (
    <main className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />

      <div className="mx-auto max-w-content px-4 pt-8 pb-16">
        <Link
          href="/bootcamps"
          className="mb-5 inline-flex items-center gap-1.5 text-body-sm text-neutral-500 transition hover:text-brand-primary"
        >
          <ArrowLeft size={15} /> All rooms
        </Link>

        {/* Hero — gradient header that matches the catalog card identity */}
        <header
          className="relative overflow-hidden rounded-3xl p-7 ring-1 ring-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] md:p-10"
          style={{
            backgroundImage: `linear-gradient(135deg, ${visual.from} 0%, ${visual.to} 100%)`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-black/20 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
                  <Icon size={22} strokeWidth={2.1} />
                </div>
                <SectionLabel
                  tone="brand"
                  className="!text-white/85"
                  icon={<GraduationCap size={12} />}
                >
                  {room.label} room
                </SectionLabel>
              </div>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tighter text-white md:text-5xl">
                {room.label}
              </h1>
              <p className="mt-2 text-[14px] font-semibold uppercase tracking-wider text-white/85">
                {tagline}
              </p>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-white/80">
                {room.blurb}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <Layers size={13} /> {bcs.length}{" "}
                  {bcs.length === 1 ? "live cohort" : "live cohorts"}
                </span>
                {instructorIds.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={13} /> {instructorIds.length}{" "}
                    {instructorIds.length === 1 ? "instructor" : "instructors"}
                  </span>
                ) : null}
                {lectures.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Video size={13} /> {lectures.length}{" "}
                    {lectures.length === 1 ? "guest lecture" : "guest lectures"}
                  </span>
                ) : null}
              </div>
            </div>

            {owned ? (
              <div className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/25 backdrop-blur">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                  <CheckCircle2 size={12} /> Full access
                </p>
                <p className="mt-1 text-[12.5px] text-white/80">
                  Pick any subject below — no enrol step.
                </p>
              </div>
            ) : null}
          </div>
        </header>

        {/* Access fork — owners go straight to subjects + lectures; non-owners
            hit the purchase wall. The wall replaces both the cohort grid AND
            the lectures section so the room is genuinely gated. */}
        {owned ? (
          <OwnerView
            roomId={room.id}
            roomLabel={room.label}
            cohorts={bcs}
            instructors={instructorIndex}
            enrolledIds={enrolledIds}
            ownedCourses={ownedCourses}
            allCoursesIncluded={allCoursesIncluded}
            lectures={lectures}
            curriculum={curriculum}
          />
        ) : (
          <div className="mt-8">
            <RoomLockedWall
              id={room.id}
              cohortCount={bcs.length}
              instructorCount={instructorIds.length}
            />
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Owner view ─────────────────────────────────────────────────────────────

function OwnerView({
  roomId,
  roomLabel: label,
  cohorts,
  instructors,
  enrolledIds,
  ownedCourses,
  allCoursesIncluded,
  lectures,
  curriculum,
}: {
  roomId: BootcampCategory;
  roomLabel: string;
  cohorts: Awaited<ReturnType<typeof listBootcamps>>;
  instructors: Record<string, { name?: string } | undefined>;
  enrolledIds: string[];
  ownedCourses: BootcampCategory[];
  allCoursesIncluded: boolean;
  lectures: Awaited<ReturnType<typeof listRoomLecturesByRoom>>;
  curriculum: readonly string[];
}) {
  return (
    <div className="mt-10 space-y-12">
      {/* Curriculum snapshot — reminds the buyer of what their course
          ownership covers, before the subject grid. */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <SectionLabel tone="brand" icon={<Sparkles size={12} />}>
              Course outline
            </SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-neutral-950">
              What this room covers
            </h2>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {curriculum.map((line, i) => (
            <li
              key={line}
              className="flex items-start gap-2.5 rounded-2xl bg-white p-4 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_40px_-22px_rgba(0,0,0,0.35)]"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-[11px] font-bold text-brand-primary ring-1 ring-brand-100">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[13.5px] leading-snug text-neutral-700">
                {line}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Subjects (cohorts) */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <SectionLabel tone="brand" icon={<Layers size={12} />}>
              Subjects
            </SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-neutral-950">
              {cohorts.length === 0
                ? "No subjects yet — first one drops soon"
                : `${cohorts.length} ${
                    cohorts.length === 1 ? "subject" : "subjects"
                  } ready to watch`}
            </h2>
            <p className="mt-1 text-body-sm text-neutral-500">
              Click a subject to start watching — every lesson plays
              instantly, no enrol step.
            </p>
          </div>
        </div>
        {cohorts.length === 0 ? (
          <GlassCard className="mx-auto max-w-xl py-14 text-center">
            <p className="text-sm leading-relaxed text-brand-muted">
              You already own this course. We&apos;ll surface the first{" "}
              {label} cohort here the moment it opens — no extra purchase
              needed.
            </p>
          </GlassCard>
        ) : (
          <BootcampGrid
            bootcamps={cohorts}
            instructors={instructors}
            enrolledIds={enrolledIds}
            ownedCourses={ownedCourses}
            allCoursesIncluded={allCoursesIncluded}
            hideFilters
          />
        )}
      </section>

      {/* Guest lectures — owners-only */}
      {lectures.length > 0 ? (
        <section>
          <div className="mb-5">
            <SectionLabel tone="brand" icon={<Video size={12} />}>
              Guest lectures
            </SectionLabel>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-neutral-950">
              Talks from operators
            </h2>
            <p className="mt-1 text-body-sm text-neutral-500">
              Recruiters and operators currently shipping in {label}.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {lectures.map((lec) => (
              <article
                key={lec.id}
                className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_22px_55px_-26px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_30px_70px_-26px_rgba(0,0,0,0.55)]"
              >
                <VideoPlayer
                  url={lec.videoUrl}
                  posterUrl={lec.posterUrl}
                  title={lec.title}
                />
                <div className="p-5">
                  <h3 className="font-display text-base font-bold leading-snug text-neutral-950">
                    {lec.title}
                  </h3>
                  {lec.description ? (
                    <p className="mt-1.5 line-clamp-3 text-[13.5px] leading-relaxed text-neutral-500">
                      {lec.description}
                    </p>
                  ) : null}
                  {lec.durationMin ? (
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      {lec.durationMin} min watch
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Subtle CTA back to the cart for buyers stacking more courses */}
      <section className="rounded-2xl bg-neutral-50/80 p-6 text-center ring-1 ring-neutral-200">
        <p className="text-[13px] text-neutral-600">
          Want to add another room to your library?
        </p>
        <Link
          href="/bootcamps"
          className="mt-3 inline-block"
        >
          <Button variant="secondary" size="sm">
            Back to all rooms
          </Button>
        </Link>
      </section>
    </div>
  );
}
