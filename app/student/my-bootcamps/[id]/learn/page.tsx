import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  getBootcampProgress,
  getUserById,
  listLiveSessionsByBootcamp,
} from "@/server/store";
import { BlobField, GlassNavbar, GlassBadge } from "@/components/glass";
import { LearnInterface } from "@/components/student/LearnInterface";
import type { BootcampProgress } from "@/shared/types";

export default async function LearnPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?next=/student/my-bootcamps/${params.id}/learn`);
  if (session.user.role !== "student") redirect("/");

  const bootcamp = await getBootcampById(params.id);
  if (!bootcamp) notFound();
  if (!bootcamp.enrolledStudentIds.includes(session.user.id)) {
    redirect(`/bootcamp/${params.id}`);
  }
  // Fetch the bootcamp once above, then parallelize the rest. (Previously this
  // re-fetched the bootcamp a second time just to read instructorId, and ran
  // live-sessions + progress serially.)
  const [instructor, liveSessions, existing] = await Promise.all([
    getUserById(bootcamp.instructorId),
    listLiveSessionsByBootcamp(params.id),
    getBootcampProgress(session.user.id, params.id),
  ]);
  const upcomingLive = liveSessions
    .filter((s) => s.status === "scheduled" || s.status === "live")
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    )
    .map((s) => ({
      id: s.id,
      title: s.title ?? "Live session",
      startsAt: s.startsAt,
      durationMin: s.durationMin,
      status: s.status,
      roomCode: s.roomCode,
    }));
  const progress: BootcampProgress = existing ?? {
    bootcampId: params.id,
    videosWatched: [],
    skillChecksPassed: [],
    skillCheckAttempts: {},
    notes: {},
    liveAttended: false,
    verifiedBadgeIssued: false,
  };

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <div className="mb-5">
          <GlassBadge tone="brand">{bootcamp.skill}</GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            {bootcamp.title}
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {bootcamp.durationWeeks}w · {bootcamp.videos.length} videos · live workshop
            + graded assignment
          </p>
        </div>
        <LearnInterface
          bootcamp={bootcamp}
          instructorName={instructor?.name ?? "Instructor"}
          initialProgress={progress}
          upcomingLive={upcomingLive}
        />
      </div>
    </main>
  );
}
