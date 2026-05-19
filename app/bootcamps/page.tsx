import { getServerSession } from "next-auth";
import { GraduationCap } from "lucide-react";
import { authOptions } from "@/server/auth";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh, SectionLabel } from "@/components/ui";
import { listBootcamps, getUserById, getUsersByIds } from "@/server/store";
import { BootcampGrid } from "@/components/student/BootcampGrid";

export default async function BootcampCatalog() {
  const session = await getServerSession(authOptions);
  const bcs = await listBootcamps();

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
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-violet-600 text-white text-lg">
              ✦
            </span>
            <div>
              <p className="text-body-sm font-semibold text-violet-900">
                Every bootcamp is bundled with Premium.
              </p>
              <p className="text-body-xs text-violet-700">
                One ₹4,999 lifetime payment unlocks all bootcamps below — no
                per-course fees.{" "}
                <a href="/upgrade?to=premium" className="underline font-semibold">
                  Go Premium
                </a>
              </p>
            </div>
          </div>
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
