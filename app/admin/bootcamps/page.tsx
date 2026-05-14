import { SectionHeader } from "@/components/arcade/SectionHeader";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { listBootcamps, getUserById } from "@/lib/data/store";
import { Star, Users } from "lucide-react";

export default function BootcampsAdmin() {
  const bcs = listBootcamps();
  return (
    <div className="p-6 space-y-6">
      <SectionHeader eyebrow="BOOTCAMPS" title="Catalog & Enrollments" color="yellow" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bcs.map((b) => {
          const instructor = getUserById(b.instructorId);
          const rev = b.enrolledStudentIds.length * b.priceINR;
          return (
            <ArcadeCard key={b.id} glow="yellow">
              <Badge tone="yellow" className="mb-2">{b.skill}</Badge>
              <p className="font-pixel text-sm text-neon-yellow mb-1">{b.title}</p>
              <p className="font-mono text-[10px] text-ink-muted">by {instructor?.name}</p>
              <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-xs">
                <Stat label="₹/seat" value={`₹${b.priceINR.toLocaleString("en-IN")}`} color="text-neon-pink" />
                <Stat label="Enrolled" value={b.enrolledStudentIds.length} color="text-neon-green" />
                <Stat label="Revenue" value={`₹${rev.toLocaleString("en-IN")}`} color="text-neon-blue" />
              </div>
              <p className="font-mono text-[10px] text-ink-muted mt-3 flex gap-3">
                <span><Star size={10} className="inline text-neon-yellow" /> {b.rating}</span>
                <span><Users size={10} className="inline" /> {b.enrolledStudentIds.length}</span>
                <span>{b.durationWeeks}w</span>
              </p>
            </ArcadeCard>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="border-2 border-bg-ink p-2 text-center">
      <p className="text-[9px] text-ink-muted">{label}</p>
      <p className={`font-pixel text-xs ${color}`}>{value}</p>
    </div>
  );
}
