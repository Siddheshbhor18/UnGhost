import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { authOptions } from "@/server/auth";
import { GlassNavbar, GlassBadge, GlassCard } from "@/components/glass";
import { BackdropMesh, SectionLabel } from "@/components/ui";
import {
  listBootcamps,
  getUserById,
  getUsersByIds,
  listRoomLecturesByRoom,
} from "@/server/store";
import { BootcampGrid } from "@/components/student/BootcampGrid";
import { VideoPlayer } from "@/components/bootcamp/VideoPlayer";
import { getRoom, isRoomId } from "@/shared/rooms";

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
  if (session?.user?.id) {
    const u = await getUserById(session.user.id);
    enrolledIds = u?.profile?.enrolledBootcamps ?? [];
  }

  return (
    <main className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />

      <div className="mx-auto max-w-content px-4 pt-8 pb-16">
        <Link
          href="/bootcamps"
          className="inline-flex items-center gap-1.5 text-body-sm text-neutral-500 hover:text-brand-primary transition mb-5"
        >
          <ArrowLeft size={15} /> All rooms
        </Link>

        <div className="mb-8 max-w-prose">
          <SectionLabel tone="brand" icon={<GraduationCap size={12} />}>
            {room.label} room
          </SectionLabel>
          <h1 className="font-display font-extrabold text-display-xl text-neutral-950 mt-2 tracking-tighter">
            {room.label}
          </h1>
          <p className="text-body-md text-neutral-500 mt-3 leading-relaxed">
            {room.blurb}
          </p>
        </div>

        {bcs.length === 0 ? (
          <GlassCard className="text-center py-14 max-w-xl mx-auto">
            <GlassBadge tone="warn">First cohort forming</GlassBadge>
            <h3 className="font-display font-bold text-xl text-brand-ink mt-3 mb-1.5">
              No live cohorts yet
            </h3>
            <p className="text-sm text-brand-muted leading-relaxed">
              The first {room.label} cohort is being put together. Go Premium
              now and you&apos;ll have access the moment it opens.
            </p>
            <Link
              href="/upgrade?to=premium"
              className="inline-flex items-center mt-5 px-4 py-2 rounded-full bg-brand-gradient text-white text-sm font-semibold shadow-brand-glow"
            >
              Go Premium
            </Link>
          </GlassCard>
        ) : (
          <BootcampGrid
            bootcamps={bcs}
            instructors={instructorIndex}
            enrolledIds={enrolledIds}
            hideFilters
          />
        )}

        {lectures.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display font-bold text-2xl text-neutral-950 mb-1 tracking-tight">
              Guest lectures
            </h2>
            <p className="text-body-sm text-neutral-500 mb-6">
              Talks from recruiters and operators working in {room.label}.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {lectures.map((lec) => (
                <GlassCard key={lec.id} className="overflow-hidden !p-0">
                  <VideoPlayer
                    url={lec.videoUrl}
                    posterUrl={lec.posterUrl}
                    title={lec.title}
                  />
                  <div className="p-4">
                    <h3 className="font-display font-bold text-base text-brand-ink leading-snug">
                      {lec.title}
                    </h3>
                    {lec.description ? (
                      <p className="text-sm text-brand-muted mt-1.5 line-clamp-3">
                        {lec.description}
                      </p>
                    ) : null}
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
