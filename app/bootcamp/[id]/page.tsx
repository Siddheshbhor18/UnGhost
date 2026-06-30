import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  enrollStudentInBootcamp,
  getBootcampById,
  getUserById,
  listLiveSessionsByBootcamp,
  listPublishedRecordingsByBootcamp,
} from "@/server/store";
import { ownsCourse } from "@/server/lib/quota";
import { BlobField, GlassNavbar } from "@/components/glass";
import { BootcampDetailClient } from "./BootcampDetailClient";

interface Props {
  params: { id: string };
}

/**
 * Server-rendered bootcamp detail. Fetches bootcamp + any kept session
 * recordings in parallel, hands both to the interactive island.
 */
export default async function BootcampPage({ params }: Props) {
  const [session, bootcamp, recordings, liveSessions] = await Promise.all([
    getServerSession(authOptions),
    getBootcampById(params.id),
    listPublishedRecordingsByBootcamp(params.id),
    listLiveSessionsByBootcamp(params.id),
  ]);
  if (!bootcamp) notFound();

  // Resolve "owns the parent course". Course ownership is the single gate —
  // any student who owns the room owns every cohort inside it (the user-
  // facing flow no longer requires a per-cohort "Enroll" click; that step is
  // implicit). For analytics we still record enrolment, idempotently.
  const user = session?.user?.id ? await getUserById(session.user.id) : null;
  const ownsRoom = user ? ownsCourse(user, bootcamp.category) : false;
  const alreadyEnrolled =
    !!user && (bootcamp.enrolledStudentIds ?? []).includes(user.id);

  // Auto-enrol on first owner view — silent, idempotent, fire-and-forget so
  // the page render isn't gated on the write. Failure here just delays the
  // analytics signal; the buyer still sees full content because `ownsRoom`
  // drives access.
  if (user && ownsRoom && !alreadyEnrolled) {
    void enrollStudentInBootcamp(user.id, bootcamp.id).catch(() => {});
  }

  // Drafts / in-review / changes-requested / archived stay invisible to
  // anyone but the owning instructor, admins, or already-enrolled students
  // — don't leak unpublished content.
  const isPublished = (bootcamp.status ?? "published") === "published";
  const canViewUnpublished =
    session?.user?.id === bootcamp.instructorId ||
    session?.user?.role === "admin" ||
    alreadyEnrolled;
  if (!isPublished && !canViewUnpublished) notFound();

  // Only surface scheduled + live sessions — ended/cancelled clutter UI.
  const visibleSessions = liveSessions
    .filter((s) => s.status === "scheduled" || s.status === "live")
    .map((s) => ({
      id: s.id,
      title: s.title ?? "Live session",
      startsAt: s.startsAt,
      durationMin: s.durationMin,
      status: s.status,
      roomCode: s.roomCode,
      registeredCount: s.registeredStudentIds?.length ?? 0,
    }));

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <BootcampDetailClient
        bootcamp={bootcamp}
        ownsRoom={ownsRoom}
        initialEnrolled={alreadyEnrolled || ownsRoom}
        recordings={recordings}
        liveSessions={visibleSessions}
      />
    </main>
  );
}
