import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Radio, Users as UsersIcon, Calendar } from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  listBootcampsByInstructor,
  listLiveSessionsByInstructor,
} from "@/server/store";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { LiveScheduleClient } from "@/components/instructor/LiveScheduleClient";

export default async function InstructorLivePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/instructor/live");
  if (session.user.role !== "instructor") redirect("/");

  const [bootcamps, sessions] = await Promise.all([
    listBootcampsByInstructor(session.user.id),
    listLiveSessionsByInstructor(session.user.id),
  ]);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-6">
          <div>
            <GlassBadge tone="brand">
              <Radio size={11} /> Live sessions
            </GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Run live coaching rooms
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Schedule sessions for any of your published bootcamps. Students get
              an automatic invite + reminder.
            </p>
          </div>
          <Link href="/instructor/today" className="btn-glass">
            ← Today
          </Link>
        </div>

        {bootcamps.length === 0 ? (
          <GlassCard className="!p-8 text-center">
            <Calendar size={28} className="mx-auto text-brand-muted mb-3" />
            <p className="font-display font-bold text-brand-ink">
              No bootcamps yet
            </p>
            <p className="text-sm text-brand-muted mt-2">
              Create a bootcamp first, then schedule live sessions for it.
            </p>
            <Link href="/instructor/studio/new" className="btn-brand mt-4 inline-flex">
              + New bootcamp
            </Link>
          </GlassCard>
        ) : (
          <LiveScheduleClient
            bootcamps={bootcamps.map((b) => ({ id: b.id, title: b.title }))}
            initialSessions={sessions}
          />
        )}

        <div className="mt-8 grid lg:grid-cols-3 gap-4">
          <Stat
            icon={<Radio size={14} />}
            label="Total scheduled"
            value={
              sessions.filter((s) => s.status === "scheduled").length
            }
          />
          <Stat
            icon={<UsersIcon size={14} />}
            label="Total registrations"
            value={sessions.reduce(
              (sum, s) => sum + s.registeredStudentIds.length,
              0,
            )}
          />
          <Stat
            icon={<Calendar size={14} />}
            label="Sessions delivered"
            value={sessions.filter((s) => s.status === "ended").length}
          />
        </div>
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-brand-primary">{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-brand-primary">{value}</p>
    </GlassCard>
  );
}
