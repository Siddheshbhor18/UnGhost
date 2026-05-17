import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth";
import {
  getUserById,
  listApplicationsByStudent,
  listCoachConversations,
  listJobs,
} from "@/server/store";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { Sparkles, Briefcase, Target, BookOpen } from "lucide-react";
import { FullCoach } from "@/components/student/FullCoach";
import { COACH_PERSONAS } from "@/shared/types";

export default async function StudentCoachPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/coach");
  if (session.user.role !== "student") redirect("/");

  const [user, apps, jobs, conversations] = await Promise.all([
    getUserById(session.user.id),
    listApplicationsByStudent(session.user.id),
    listJobs(),
    listCoachConversations(session.user.id),
  ]);
  const firstName = user?.profile?.alias ?? user?.name?.split(" ")[0] ?? "there";
  const activeApps = apps.filter((a) => !["hired", "rejected"].includes(a.stage));
  const persona = user?.coachPersona ?? "balanced";
  const memorySummary =
    user?.aiCoachMemory?.summary ??
    "I'll build a memory of your goals as we chat. Tell me about your target role + biggest blocker.";
  const personaDef =
    COACH_PERSONAS.find((p) => p.id === persona) ?? COACH_PERSONAS[0];

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <GlassBadge tone="brand">
              <Sparkles size={12} /> AI Coach · {personaDef.label} voice
            </GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Your career strategy partner
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              I remember our chats across sessions. {personaDef.tagline}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 min-h-[calc(100vh-220px)]">
          {/* Center: full chat (has its own conversation+persona sidebar) */}
          <div className="lg:col-span-9">
            <FullCoach
              studentFirstName={firstName}
              initialPersona={persona}
              initialConversations={conversations}
            />
          </div>

          {/* Right: context rail */}
          <aside className="lg:col-span-3 space-y-4">
            <GlassCard className="!p-4">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
                Memory summary
              </p>
              <p className="text-xs text-brand-ink/85 leading-relaxed">
                {memorySummary}
              </p>
              {user?.aiCoachMemory?.facts && user.aiCoachMemory.facts.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {user.aiCoachMemory.facts.slice(0, 4).map((f, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-brand-ink/75 leading-snug flex items-start gap-1.5"
                    >
                      <span className="text-brand-primary mt-0.5">▸</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-brand-muted mt-3">
                Memory auto-updates after each chat turn.
              </p>
              <Link
                href="/student/settings"
                className="text-[11px] text-brand-primary font-semibold mt-2 inline-block hover:underline"
              >
                Edit memory + persona →
              </Link>
            </GlassCard>

            <GlassCard className="!p-4">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
                Quick actions
              </p>
              <div className="space-y-2">
                <QuickAction icon={<Target size={12} />} label="Analyse my profile gaps" />
                <QuickAction
                  icon={<Briefcase size={12} />}
                  label="Compare my active apps"
                />
                <QuickAction icon={<BookOpen size={12} />} label="Recommend a bootcamp" />
              </div>
            </GlassCard>

            {activeApps.length > 0 && (
              <GlassCard className="!p-4">
                <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
                  Active applications ({activeApps.length})
                </p>
                <ul className="space-y-1.5">
                  {activeApps.slice(0, 3).map((a) => {
                    const j = jobs.find((x) => x.id === a.jobId);
                    return (
                      <li key={a.id} className="text-xs text-brand-ink/85">
                        <span className="text-brand-primary font-semibold">▸</span>{" "}
                        {j?.title} ·{" "}
                        <span className="text-brand-muted">{a.matchPct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </GlassCard>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function QuickAction({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="w-full text-left text-xs font-medium text-brand-ink/85 hover:text-brand-primary flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-brand-primary/5 transition">
      <span className="text-brand-primary">{icon}</span>
      {label}
    </button>
  );
}
