import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { listBootcampsByInstructor } from "@/server/store";
import {
  Plus,
  Users as UsersIcon,
  Star,
  Video,
  Calendar,
  CheckCircle2,
  Eye,
  Edit3,
} from "lucide-react";

export default async function ContentStudio() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=instructor");
  if (session.user.role !== "instructor") redirect("/");

  const all = await listBootcampsByInstructor(session.user.id);

  // Real status splits — defaults to "published" on seed for backwards compat
  const statusOf = (s: string | undefined) => s ?? "published";
  const drafts = all.filter((b) => statusOf(b.status) === "draft");
  const inReview = all.filter((b) => statusOf(b.status) === "in_review");
  const published = all.filter((b) => statusOf(b.status) === "published");
  const archived = all.filter((b) => statusOf(b.status) === "archived");
  const changesRequested = all.filter(
    (b) => statusOf(b.status) === "changes_requested",
  );
  // Show everything in the grid for now; filter chips are visual.
  const bcs = [...drafts, ...changesRequested, ...inReview, ...published];

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-16">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <GlassBadge tone="warn">Content Studio</GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Your bootcamp catalogue
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Drafts, in-review, published, archived. Click any card to open the editor.
            </p>
          </div>
          <Link href="/instructor/studio/new" className="btn-brand">
            <Plus size={14} /> New bootcamp
          </Link>
        </div>

        {/* Tabs (visual only — single Published bucket for Phase 1) */}
        <div className="flex gap-1 p-1 rounded-2xl bg-brand-ink/5 mb-6 max-w-xl text-xs font-semibold flex-wrap">
          <TabPill label={`All · ${bcs.length}`} active />
          <TabPill label={`Drafts · ${drafts.length}`} />
          <TabPill label={`In Review · ${inReview.length}`} />
          <TabPill label={`Published · ${published.length}`} />
          <TabPill label={`Archived · ${archived.length}`} />
        </div>

        {/* Catalogue grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bcs.map((b) => {
            const status = b.status ?? "published";
            const statusTone =
              status === "published"
                ? "success"
                : status === "in_review"
                ? "warn"
                : status === "changes_requested"
                ? "danger"
                : "neutral";
            return (
            <GlassCard key={b.id} interactive className="space-y-3 flex flex-col">
              <div className="flex items-center justify-between">
                <GlassBadge tone="brand">{b.skill}</GlassBadge>
                <GlassBadge tone={statusTone}>
                  <CheckCircle2 size={9} /> {status.replace("_", " ")}
                </GlassBadge>
              </div>

              <div className="flex-1">
                <h3 className="font-display font-bold text-base text-brand-ink line-clamp-1">
                  {b.title}
                </h3>
                <p className="text-xs text-brand-muted line-clamp-2 mt-1">
                  {b.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-brand-ink/5">
                <Stat
                  icon={<UsersIcon size={11} />}
                  label="Enrolled"
                  value={b.enrolledStudentIds.length}
                  tone="brand"
                />
                <Stat
                  icon={<Star size={11} />}
                  label="Rating"
                  value={b.rating.toFixed(1)}
                  tone="warn"
                />
                <Stat
                  icon={<Video size={11} />}
                  label="Videos"
                  value={b.videos.length}
                  tone="brand"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-brand-muted pt-2 border-t border-brand-ink/5">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={10} />
                  {b.durationWeeks}w · {b.liveSlots.length} live
                </span>
                <span>₹{b.priceINR.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/bootcamp/${b.id}`}
                  className="text-xs font-semibold inline-flex items-center gap-1 text-brand-muted hover:text-brand-primary"
                >
                  <Eye size={12} /> Preview
                </Link>
                <Link
                  href={`/instructor/studio/${b.id}`}
                  className="text-xs font-semibold inline-flex items-center gap-1 text-brand-primary hover:underline ml-auto"
                >
                  <Edit3 size={12} /> Edit
                </Link>
              </div>
            </GlassCard>
            );
          })}

          {/* Create card */}
          <Link
            href="/instructor/studio/new"
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-primary/30 bg-white/30 backdrop-blur-sm p-8 hover:border-brand-primary hover:bg-white/50 transition group"
          >
            <span className="grid place-items-center w-12 h-12 rounded-xl bg-brand-gradient text-white shadow-brand-glow mb-3 group-hover:scale-110 transition">
              <Plus size={20} />
            </span>
            <p className="font-display font-bold text-brand-ink">Create bootcamp</p>
            <p className="text-xs text-brand-muted text-center mt-1">
              Paste a syllabus, hit Parse, edit, submit for review.
            </p>
          </Link>
        </div>

        {published.length === 0 && (
          <GlassCard className="text-center !py-12 mt-6">
            <p className="font-display font-bold text-brand-ink mb-2">
              No published bootcamps yet
            </p>
            <p className="text-sm text-brand-muted mb-5">
              Submit your first bootcamp for Admin review — usually approved within 48
              hours.
            </p>
            <Link href="/instructor/studio/new" className="btn-brand">
              <Plus size={14} /> Create bootcamp
            </Link>
          </GlassCard>
        )}
      </div>
    </main>
  );
}

function TabPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={
        active
          ? "bg-white shadow-sm text-brand-ink px-3 py-1.5 rounded-xl"
          : "text-brand-muted px-3 py-1.5 rounded-xl hover:text-brand-ink cursor-pointer"
      }
    >
      {label}
    </span>
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
  tone: "brand" | "warn";
}) {
  const cls = tone === "warn" ? "text-amber-600" : "text-brand-primary";
  return (
    <div className="bg-white/50 rounded-lg border border-brand-ink/5 p-2 text-center">
      <p
        className={`flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider ${cls}`}
      >
        {icon}
        {label}
      </p>
      <p className={`font-display text-sm font-bold mt-0.5 ${cls}`}>{value}</p>
    </div>
  );
}
