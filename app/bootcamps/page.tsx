import Link from "next/link";
import {
  GraduationCap,
  Brain,
  Megaphone,
  Handshake,
  Rocket,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { GlassNavbar, GlassBadge, GlassCard } from "@/components/glass";
import { BackdropMesh, SectionLabel } from "@/components/ui";
import { listBootcamps } from "@/server/store";
import { ROOMS, type BootcampCategory } from "@/shared/rooms";

// Fetches the live bootcamp catalogue (behind a Redis cache); render per
// request instead of prerendering at build, so a transient DB/cache blip
// can't fail the build. The cached() layer keeps the per-request cost low.
export const dynamic = "force-dynamic";

const ROOM_ICON: Record<BootcampCategory, React.ReactNode> = {
  ai: <Brain size={22} />,
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
  const bcs = await listBootcamps();
  const liveByRoom = new Map<BootcampCategory, number>();
  for (const b of bcs) {
    if (isLive(b.status)) {
      liveByRoom.set(b.category, (liveByRoom.get(b.category) ?? 0) + 1);
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
            Five focused rooms. Each one bundles recorded modules, a live
            session with the instructor, and a skill-verify gate that earns a
            badge recruiters can filter on.
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-violet-600 text-white text-lg">
              ✦
            </span>
            <div>
              <p className="text-body-sm font-semibold text-violet-900">
                Every room is bundled with Premium.
              </p>
              <p className="text-body-xs text-violet-700">
                One ₹4,999 lifetime payment unlocks every room — no per-course
                fees.{" "}
                <a href="/upgrade?to=premium" className="underline font-semibold">
                  Go Premium
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ROOMS.map((room) => {
            const count = liveByRoom.get(room.id) ?? 0;
            return (
              <Link key={room.id} href={`/bootcamps/${room.id}`}>
                <GlassCard interactive className="h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-gradient text-white shadow-brand-glow">
                      {ROOM_ICON[room.id]}
                    </span>
                    {count > 0 ? (
                      <GlassBadge tone="success">
                        {count} {count === 1 ? "cohort" : "cohorts"}
                      </GlassBadge>
                    ) : (
                      <GlassBadge tone="warn">First cohort forming</GlassBadge>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-xl text-brand-ink mb-1.5">
                    {room.label}
                  </h3>
                  <p className="text-sm text-brand-muted leading-relaxed mb-4 flex-1">
                    {room.blurb}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
                    Enter room <ArrowRight size={15} />
                  </span>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
