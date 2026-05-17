import { getServerSession } from "next-auth";
import { GraduationCap } from "lucide-react";
import { authOptions } from "@/server/auth";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh, SectionLabel } from "@/components/ui";
import { listBootcamps, getUserById } from "@/server/store";
import { BootcampGrid } from "@/components/student/BootcampGrid";

export default async function BootcampCatalog() {
  const session = await getServerSession(authOptions);
  const bcs = await listBootcamps();

  const instructorIds = Array.from(new Set(bcs.map((b) => b.instructorId)));
  const instructorList = await Promise.all(instructorIds.map((id) => getUserById(id)));
  const instructorIndex = Object.fromEntries(
    instructorIds.map((id, i) => [
      id,
      instructorList[i] ? { name: instructorList[i]!.name } : undefined,
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
        <div className="mb-8 max-w-prose">
          <SectionLabel tone="brand" icon={<GraduationCap size={12} />}>
            Skill-up
          </SectionLabel>
          <h1 className="font-display font-extrabold text-display-xl text-neutral-950 mt-2 tracking-tighter">
            Bootcamps that close the gap.
          </h1>
          <p className="text-body-md text-neutral-500 mt-3 leading-relaxed">
            Recorded modules plus a live session with the instructor. Pass the
            skill-verify gate, earn a verified badge recruiters can filter on.
          </p>
        </div>

        <BootcampGrid
          bootcamps={bcs}
          instructors={instructorIndex}
          enrolledIds={enrolledIds}
        />
      </div>
    </main>
  );
}
