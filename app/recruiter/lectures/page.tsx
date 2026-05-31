import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { listRoomLecturesByRecruiter } from "@/server/store";
import { BlobField, GlassBadge, GlassNavbar } from "@/components/glass";
import { Video } from "lucide-react";
import { LecturesManager } from "@/components/recruiter/LecturesManager";

export default async function RecruiterLecturesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") redirect("/");

  const lectures = await listRoomLecturesByRecruiter(session.user.id);

  return (
    <main className="min-h-screen relative">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <GlassBadge tone="brand">
          <Video size={12} /> Guest lectures
        </GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3 mb-1">
          Post a lecture
        </h1>
        <p className="text-sm text-brand-muted mb-8">
          Upload a talk into one of the five subject rooms. Students browsing
          that room see it right away. You can take any of yours down anytime.
        </p>

        <LecturesManager initial={lectures} />
      </div>
    </main>
  );
}
