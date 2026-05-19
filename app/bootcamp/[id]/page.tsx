import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  listPublishedRecordingsByBootcamp,
} from "@/server/store";
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
  const [session, bootcamp, recordings] = await Promise.all([
    getServerSession(authOptions),
    getBootcampById(params.id),
    listPublishedRecordingsByBootcamp(params.id),
  ]);
  if (!bootcamp) notFound();

  const initialEnrolled =
    !!session?.user?.id &&
    (bootcamp.enrolledStudentIds ?? []).includes(session.user.id);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <BootcampDetailClient
        bootcamp={bootcamp}
        initialEnrolled={initialEnrolled}
        recordings={recordings}
      />
    </main>
  );
}
