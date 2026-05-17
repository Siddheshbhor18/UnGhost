import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  getLiveSessionByCode,
  getUserById,
  recordLiveAttendance,
} from "@/server/store";
import { LiveRoom } from "@/components/live/LiveRoom";
import { BlobField, GlassBadge, GlassCard } from "@/components/glass";
import Link from "next/link";
import { Ghost } from "lucide-react";

interface Ctx {
  params: { code: string };
}

export default async function LiveRoomPage({ params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?next=/live/${params.code}`);

  const live = await getLiveSessionByCode(params.code);

  if (!live) {
    return (
      <main className="relative min-h-screen grid place-items-center px-4">
        <BlobField />
        <GlassCard className="max-w-md text-center !p-8">
          <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-brand-gradient text-white shadow-brand-glow mb-4">
            <Ghost size={28} />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink">
            Room not found
          </h1>
          <p className="text-sm text-brand-muted mt-2">
            The room code <span className="font-mono">{params.code}</span> doesn&apos;t exist
            or the session was cancelled.
          </p>
          <Link href="/student/live" className="btn-brand mt-5 inline-flex">
            ← Back to lobby
          </Link>
        </GlassCard>
      </main>
    );
  }

  if (live.status === "ended" || live.status === "cancelled") {
    return (
      <main className="relative min-h-screen grid place-items-center px-4">
        <BlobField />
        <GlassCard className="max-w-md text-center !p-8">
          <GlassBadge tone={live.status === "ended" ? "neutral" : "warn"}>
            {live.status === "ended" ? "Session ended" : "Cancelled"}
          </GlassBadge>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
            {live.title}
          </h1>
          <p className="text-sm text-brand-muted mt-2">
            {live.status === "ended"
              ? `This room closed at ${new Date(live.endedAt ?? live.startsAt).toLocaleString()}.`
              : "Instructor cancelled this session."}
          </p>
          {live.recordingUrl && (
            <a href={live.recordingUrl} className="btn-brand mt-5 inline-flex">
              Watch recording
            </a>
          )}
          <Link
            href={session.user.role === "instructor" ? "/instructor/live" : "/student/live"}
            className="btn-glass mt-3 inline-flex"
          >
            ← Back
          </Link>
        </GlassCard>
      </main>
    );
  }

  const isInstructor = session.user.id === live.instructorId;
  if (!isInstructor && live.status === "scheduled") {
    return (
      <main className="relative min-h-screen grid place-items-center px-4">
        <BlobField />
        <GlassCard className="max-w-md text-center !p-8">
          <GlassBadge tone="brand">Not started yet</GlassBadge>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
            {live.title}
          </h1>
          <p className="text-sm text-brand-muted mt-2">
            Instructor hasn&apos;t opened the room yet. Try again at{" "}
            <span className="font-semibold text-brand-ink">
              {new Date(live.startsAt).toLocaleString()}
            </span>
            .
          </p>
          <Link href="/student/live" className="btn-glass mt-5 inline-flex">
            ← Back to lobby
          </Link>
        </GlassCard>
      </main>
    );
  }

  // Record attendance for students who actually joined a live room
  if (!isInstructor && live.status === "live") {
    await recordLiveAttendance(live.id, session.user.id);
  }

  const [bootcamp, user] = await Promise.all([
    getBootcampById(live.bootcampId),
    getUserById(session.user.id),
  ]);
  const myName =
    user?.profile?.alias ?? user?.name?.split(" ")[0] ?? "Guest";

  return (
    <LiveRoom
      sessionId={live.id}
      roomCode={live.roomCode}
      title={live.title}
      bootcampTitle={bootcamp?.title ?? "Bootcamp"}
      isInstructor={isInstructor}
      myName={myName}
      participantCount={live.attendedStudentIds.length + 1}
      status={live.status}
    />
  );
}
