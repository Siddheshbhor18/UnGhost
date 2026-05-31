import { Video } from "lucide-react";
import { GlassBadge } from "@/components/glass";
import { listAllRoomLectures, getUsersByIds } from "@/server/store";
import { LectureModeration } from "@/components/admin/LectureModeration";

export default async function AdminLecturesPage() {
  const lectures = await listAllRoomLectures();
  const recruiterIds = Array.from(new Set(lectures.map((l) => l.recruiterId)));
  const recruiterMap = await getUsersByIds(recruiterIds);
  const rows = lectures.map((l) => ({
    ...l,
    recruiterName: recruiterMap.get(l.recruiterId)?.name ?? "—",
  }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <GlassBadge tone="brand">
        <Video size={11} /> Lectures
      </GlassBadge>
      <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
        Lecture moderation
      </h1>
      <p className="text-sm text-brand-muted mt-1 mb-6">
        Recruiter guest-lectures publish instantly. Take down anything
        off-topic, low-quality, or abusive.
      </p>

      <LectureModeration initial={rows} />
    </div>
  );
}
