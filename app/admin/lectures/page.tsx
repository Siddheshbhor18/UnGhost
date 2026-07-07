
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
      <div className="mb-6">
        <AdminPageHeader
          badge="Lectures"
          title="Lecture moderation"
          subtitle="Recruiter guest-lectures publish instantly. Take down anything off-topic, low-quality, or abusive."
        />
      </div>

      <LectureModeration initial={rows} />
    </div>
  );
}
