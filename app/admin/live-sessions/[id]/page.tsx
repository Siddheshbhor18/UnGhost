/**
 * /admin/live-sessions/[id] — manage a single session.
 *
 * Server component fetches the session + attendee count. Client component
 * handles the form + status transitions (paste video ID, go live, end).
 */
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectMongo } from "@/server/db/mongo";
import {
  LiveSessionAttendeeModel,
  LiveSessionMessageModel,
  LiveSessionModel,
} from "@/server/db/models";
import { ManageSessionClient } from "./ManageSessionClient";

export const dynamic = "force-dynamic";

export default async function ManageLiveSessionPage({
  params,
}: {
  params: { id: string };
}) {
  await connectMongo();
  const live = await LiveSessionModel.findById(params.id).lean();
  if (!live) notFound();

  const [attendeeCount, messageCount] = await Promise.all([
    LiveSessionAttendeeModel.countDocuments({ sessionId: params.id }),
    LiveSessionMessageModel.countDocuments({
      sessionId: params.id,
      deletedAt: null,
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
      <Link
        href="/admin/live-sessions"
        className="text-xs text-brand-muted hover:text-brand-ink transition"
      >
        ← All live sessions
      </Link>

      <header className="mt-3 mb-6">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-muted mb-1">
          Manage · {live.tier ?? "free"} · {live.status}
        </p>
        <h1 className="font-display font-extrabold text-3xl text-brand-ink">
          {live.title}
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Public URL:{" "}
          <Link
            href={`/live/${live.roomCode}`}
            target="_blank"
            className="font-mono text-brand-primary hover:underline"
          >
            /live/{live.roomCode}
          </Link>
        </p>
      </header>

      <ManageSessionClient
        id={params.id}
        roomCode={live.roomCode ?? ""}
        initial={{
          title: live.title ?? "",
          description: live.description ?? "",
          startsAt: live.startsAt ?? "",
          durationMin: live.durationMin ?? 60,
          status: live.status ?? "scheduled",
          youtubeVideoId: live.youtubeVideoId ?? "",
          recordingUrl: live.recordingUrl ?? "",
          streamProvider: live.streamProvider ?? "youtube",
          cfLiveInputUid: live.cfLiveInputUid ?? "",
          cfRtmpUrl: live.cfRtmpUrl ?? "",
          cfStreamKey: live.cfStreamKey ?? "",
        }}
        stats={{ attendeeCount, messageCount }}
      />
    </div>
  );
}
