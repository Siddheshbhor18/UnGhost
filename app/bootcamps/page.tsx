import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Badge } from "@/components/arcade/Badge";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { PixelButton } from "@/components/arcade/PixelButton";
import { SectionHeader } from "@/components/arcade/SectionHeader";
import { listBootcamps, getUserById } from "@/lib/data/store";
import { Clock, Star, Users } from "lucide-react";

export default function BootcampCatalog() {
  const bcs = listBootcamps();
  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <SectionHeader
          eyebrow="DECK 03 / ACCELERATOR"
          title="Bootcamps"
          subtitle="2 recorded modules + 1 live session with the instructor. Pass the skill-verify gate, earn a verified badge that recruiters can filter on."
          color="green"
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {bcs.map((b) => {
            const instructor = getUserById(b.instructorId);
            return (
              <ArcadeCard key={b.id} glow="green" interactive>
                <Badge tone="green" className="mb-2">{b.skill}</Badge>
                <h3 className="font-pixel text-base text-neon-green mb-2">{b.title}</h3>
                <p className="font-mono text-xs text-ink-muted mb-3 line-clamp-2">{b.description}</p>
                <div className="flex flex-wrap gap-3 font-mono text-[10px] text-ink-muted mb-3">
                  <span className="inline-flex items-center gap-1"><Clock size={11} /> {b.durationWeeks}w</span>
                  <span className="inline-flex items-center gap-1"><Star size={11} className="text-neon-yellow" /> {b.rating}</span>
                  <span className="inline-flex items-center gap-1"><Users size={11} /> {b.enrolledStudentIds.length}</span>
                </div>
                <p className="font-pixel text-xs text-ink-muted mb-3">
                  by <span className="text-neon-pink">{instructor?.name}</span>
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-pixel text-lg text-neon-pink">₹{b.priceINR.toLocaleString("en-IN")}</p>
                  <Link href={`/bootcamp/${b.id}`}>
                    <PixelButton variant="green" size="sm">Enroll →</PixelButton>
                  </Link>
                </div>
              </ArcadeCard>
            );
          })}
        </div>
      </div>
    </main>
  );
}
