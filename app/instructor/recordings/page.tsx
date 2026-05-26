import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { listRecordingsByInstructor } from "@/server/store";
import { RecordingsClient } from "@/components/instructor/RecordingsClient";

export const dynamic = "force-dynamic";

/**
 * /instructor/recordings
 *
 * Lands here automatically after a live session ends. Pending recordings
 * show first with Keep / Delete CTAs; published recordings show below as a
 * library.
 */
export default async function InstructorRecordingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/instructor/recordings");
  if (session.user.role !== "instructor") redirect("/");

  const recordings = await listRecordingsByInstructor(session.user.id);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">Recordings</GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Your session library
          </h1>
          <p className="text-sm text-brand-muted mt-1 max-w-prose">
            Newly-ended sessions land in <b>Pending review</b>. Keep a clip to
            make it replayable for enrolled students, or delete it to free
            storage. Already-kept clips appear at the bottom.
          </p>
        </div>

        {recordings.length === 0 ? (
          <GlassCard className="text-center !py-12">
            <p className="font-display font-bold text-brand-ink">
              No recordings yet
            </p>
            <p className="text-sm text-brand-muted mt-2 max-w-md mx-auto">
              When you end a live session the recording shows up here once
              it&apos;s been processed.
            </p>
          </GlassCard>
        ) : (
          <RecordingsClient initial={recordings} />
        )}
      </div>
    </main>
  );
}
