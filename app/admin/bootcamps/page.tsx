import { GlassBadge, GlassCard } from "@/components/glass";
import { listBootcamps, getUserById } from "@/server/store";
import { BootcampReviewCard } from "@/components/admin/BootcampReviewCard";
import { AlertTriangle, Star, Users, Clock, IndianRupee } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  ai: "AI / GenAI",
  data_science: "Data Science",
  marketing: "Marketing",
  finance: "Finance",
  sales: "Sales / BD",
};

export default async function BootcampsAdmin() {
  const all = await listBootcamps();
  const bcs = all.filter((b) => (b.status ?? "published") === "published");
  const inReview = all.filter((b) => b.status === "in_review");
  const instructors = await Promise.all(bcs.map((b) => getUserById(b.instructorId)));
  const reviewInstructors = await Promise.all(
    inReview.map((b) => getUserById(b.instructorId)),
  );
  const totalRev = bcs.reduce((s, b) => s + b.enrolledStudentIds.length * b.priceINR, 0);
  const totalEnroll = bcs.reduce((s, b) => s + b.enrolledStudentIds.length, 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <GlassBadge tone="warn">Bootcamps</GlassBadge>
          <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
            Catalog &amp; Enrollments
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Live cohort revenue, seat counts, instructor ratings.
          </p>
        </div>
        <div className="flex gap-3">
          <GlassCard className="!p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted">
              Total Enrollments
            </p>
            <p className="font-display text-2xl font-bold text-emerald-600">
              {totalEnroll}
            </p>
          </GlassCard>
          <GlassCard className="!p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted">
              Total Revenue
            </p>
            <p className="font-display text-2xl font-bold text-brand-primary">
              ₹{(totalRev / 100000).toFixed(1)}L
            </p>
          </GlassCard>
        </div>
      </div>

      {/* ── Review queue ──────────────────────────────────────── */}
      {inReview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GlassBadge tone="warn">
              <AlertTriangle size={11} /> Review queue
            </GlassBadge>
            <p className="text-sm text-brand-muted">
              {inReview.length} bootcamp{inReview.length === 1 ? "" : "s"}{" "}
              awaiting your decision · 48-hour SLA
            </p>
          </div>
          <div className="space-y-3">
            {inReview.map((b, i) => (
              <BootcampReviewCard
                key={b.id}
                bootcamp={b}
                instructorName={reviewInstructors[i]?.name ?? "Instructor"}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Published catalogue ───────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
          Published catalog ({bcs.length})
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {bcs.map((b, i) => {
          const instructor = instructors[i];
          const rev = b.enrolledStudentIds.length * b.priceINR;
          return (
            <GlassCard key={b.id} interactive className="space-y-3">
              <div className="flex items-center justify-between">
                <GlassBadge tone="warn">
                  {CATEGORY_LABEL[b.category] ?? b.skill}
                </GlassBadge>
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                  <Star size={12} fill="currentColor" /> {b.rating}
                </span>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-brand-ink">{b.title}</p>
                <p className="text-xs text-brand-muted">by {instructor?.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat
                  icon={<IndianRupee size={12} />}
                  label="Per seat"
                  value={`₹${(b.priceINR / 1000).toFixed(0)}k`}
                  tone="brand"
                />
                <Stat
                  icon={<Users size={12} />}
                  label="Enrolled"
                  value={b.enrolledStudentIds.length}
                  tone="success"
                />
                <Stat
                  icon={<IndianRupee size={12} />}
                  label="Revenue"
                  value={`₹${(rev / 1000).toFixed(0)}k`}
                  tone="warn"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-brand-muted pt-2 border-t border-brand-ink/5">
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} /> {b.durationWeeks} weeks
                </span>
                <span>{b.videos.length} videos · {b.liveSlots.length} live</span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "brand" | "success" | "warn";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : "text-brand-primary";
  return (
    <div className="bg-white/50 rounded-xl border border-brand-ink/5 p-2.5 text-center">
      <p className={`flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider ${cls}`}>
        {icon}
        {label}
      </p>
      <p className={`font-display text-sm font-bold mt-1 ${cls}`}>{value}</p>
    </div>
  );
}
