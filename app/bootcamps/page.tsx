import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  GraduationCap,
  Brain,
  Megaphone,
  Handshake,
  Rocket,
  Briefcase,
  Workflow,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh, SectionLabel } from "@/components/ui";
import { BootcampsCatalogCard } from "@/components/courses/BootcampsCatalogCard";
import { EverythingBundleCard } from "@/components/courses/EverythingBundleCard";
import { getUserById, listBootcamps } from "@/server/store";
import { effectivePlan } from "@/server/lib/quota";
import { PLAN_LIMITS } from "@/shared/types";
import { ROOMS, type BootcampCategory } from "@/shared/rooms";

// Fetches the live bootcamp catalogue (behind a Redis cache); render per
// request instead of prerendering at build, so a transient DB/cache blip
// can't fail the build. The cached() layer keeps the per-request cost low.
export const dynamic = "force-dynamic";

const ROOM_ICON: Record<BootcampCategory, React.ReactNode> = {
  ai: <Brain size={22} />,
  gtm: <Workflow size={22} />,
  marketing: <Megaphone size={22} />,
  sales: <Handshake size={22} />,
  entrepreneurship: <Rocket size={22} />,
  freelancing: <Briefcase size={22} />,
};

/** A bootcamp counts as "live" for the room badge if it's published (or a
 *  legacy row with no explicit status). Drafts / in-review don't count. */
function isLive(status: string | undefined) {
  const s = status ?? "published";
  return s === "published";
}

export default async function BootcampRooms() {
  const [session, bcs] = await Promise.all([
    getServerSession(authOptions),
    listBootcamps(),
  ]);
  const liveByRoom = new Map<BootcampCategory, number>();
  for (const b of bcs) {
    if (isLive(b.status)) {
      liveByRoom.set(b.category, (liveByRoom.get(b.category) ?? 0) + 1);
    }
  }

  // Resolve the buyer's existing course grants so the catalog can replace the
  // add-to-cart CTA with an "Owned" state for anything they already hold.
  // Premium-grandfathered students with `bootcampsIncluded` own everything.
  let ownedSet = new Set<BootcampCategory>();
  let ownsAll = false;
  if (session?.user?.id) {
    const u = await getUserById(session.user.id);
    if (u) {
      ownsAll = PLAN_LIMITS[effectivePlan(u)].bootcampsIncluded;
      if (ownsAll) {
        ownedSet = new Set(ROOMS.map((r) => r.id));
      } else {
        const nowMs = Date.now();
        ownedSet = new Set(
          (u.ownedCourses ?? [])
            .filter((g) => Date.parse(g.expiresAt) > nowMs)
            .map((g) => g.course),
        );
      }
    }
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
            Pick a room. Close the gap.
          </h1>
          <p className="text-body-md text-neutral-500 mt-3 leading-relaxed">
            Six focused courses. Each bundles recorded modules, a live session
            with the instructor, and a skill-verify gate that earns a badge
            recruiters can filter on.
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand-500 text-white text-lg">
              ✦
            </span>
            <div>
              <p className="text-body-sm font-semibold text-brand-ink">
                ₹5,000 per course · ₹11,999 for all six.
              </p>
              <p className="text-body-xs text-brand-muted">
                Buying AI or GTM unlocks Marketing, Sales &amp; Entrepreneurship
                free.{" "}
                <Link href="/bootcamps/checkout" className="underline font-semibold">
                  View courses
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROOMS.map((room) => (
            <BootcampsCatalogCard
              key={room.id}
              id={room.id}
              label={room.label}
              blurb={room.blurb}
              icon={ROOM_ICON[room.id]}
              cohortCount={liveByRoom.get(room.id) ?? 0}
              owned={ownedSet.has(room.id)}
            />
          ))}
          <EverythingBundleCard ownedCount={ownedSet.size} />
        </div>
      </div>
    </main>
  );
}
