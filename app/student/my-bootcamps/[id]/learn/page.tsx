import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  getBootcampProgress,
  getUserById,
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

  const [bootcamp, instructor] = await Promise.all([
    getBootcampById(params.id),
    (async () => {
      const bc = await getBootcampById(params.id);
      return bc ? getUserById(bc.instructorId) : undefined;
    })(),
  ]);
  if (!bootcamp) notFound();
  if (!bootcamp.enrolledStudentIds.includes(session.user.id)) {
    redirect(`/bootcamp/${params.id}`);
  }
  const existing = await getBootcampProgress(session.user.id, params.id);
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
        />
      </div>
    </main>
  );
}
