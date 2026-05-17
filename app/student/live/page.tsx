import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Radio, Calendar, Users as UsersIcon } from "lucide-react";
import { authOptions } from "@/server/auth";
import { listUpcomingLiveForStudent } from "@/server/store";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { StudentLiveLobby } from "@/components/student/StudentLiveLobby";

export default async function StudentLivePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/live");
  if (session.user.role !== "student") redirect("/");

  const sessions = await listUpcomingLiveForStudent(session.user.id);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <GlassBadge tone="brand">
              <Radio size={11} /> Live lobby
            </GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Live coaching sessions
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Upcoming + currently live rooms from bootcamps you&apos;re enrolled in.
            </p>
          </div>
          <Link href="/bootcamps" className="btn-glass">
            Browse bootcamps
          </Link>
        </div>

        {sessions.length === 0 ? (
          <GlassCard className="!p-10 text-center">
            <Calendar size={32} className="mx-auto text-brand-muted mb-3" />
            <p className="font-display font-bold text-brand-ink">
              Nothing scheduled right now
            </p>
            <p className="text-sm text-brand-muted mt-2 max-w-md mx-auto">
              Live sessions appear here when an instructor from one of your enrolled bootcamps schedules a room. Enrol in more bootcamps to get more.
            </p>
            <Link href="/bootcamps" className="btn-brand mt-5 inline-flex">
              Explore bootcamps
            </Link>
          </GlassCard>
        ) : (
          <StudentLiveLobby
            sessions={sessions}
            studentId={session.user.id}
          />
        )}

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat
            icon={<Radio size={13} />}
            label="Live now"
            value={sessions.filter((s) => s.status === "live").length}
          />
          <Stat
            icon={<Calendar size={13} />}
            label="Scheduled"
            value={sessions.filter((s) => s.status === "scheduled").length}
          />
          <Stat
            icon={<UsersIcon size={13} />}
            label="You registered"
            value={
              sessions.filter((s) =>
                s.registeredStudentIds.includes(session.user.id),
              ).length
            }
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
