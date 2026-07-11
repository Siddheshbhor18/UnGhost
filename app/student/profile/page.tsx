import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  Award,
  Bookmark,
  CheckCircle2,
  Edit3,
  Eye,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { getUserById, listSavedJobs } from "@/server/store";

const TRAJ_LABEL: Record<string, string> = {
  actively_hunting: "Actively hunting",
  casually_exploring: "Casually exploring",
  open_to_magic: "Open to magic",
};

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/profile");
  if (session.user.role !== "student") redirect("/");

  const [user, savedJobs] = await Promise.all([
    getUserById(session.user.id),
    listSavedJobs(session.user.id),
  ]);
  if (!user || !user.profile) {
    redirect("/onboarding");
  }
  const savedCount = savedJobs.length;
  const p = user.profile!;
  const verified = new Set(
    (p.verifiedSkills ?? []).map((s) => s.toLowerCase()),
  );
  const isAnon = p.applicationIdentity === "anonymous";
  const isHidden = p.searchVisibility === false;

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-12">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <GlassBadge tone="brand">
              <Eye size={11} /> Public profile preview
            </GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              How recruiters see you
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              This is exactly the data exposed to recruiters in the candidate
              database — gated by your visibility + identity settings.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/student/settings" className="btn-glass">
              <Settings size={14} /> Settings
            </Link>
            <Link href="/student/profile/edit" className="btn-brand">
              <Edit3 size={14} /> Edit profile
            </Link>
          </div>
        </div>

        {/* Visibility banner */}
        {(isAnon || isHidden) && (
          <GlassCard className="!p-4 mb-5 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-start gap-2">
              <ShieldCheck
                size={16}
                className="text-amber-600 mt-0.5 shrink-0"
              />
              <div className="flex-1 text-sm text-amber-800">
                <p className="font-semibold">
                  {isHidden
                    ? "You're hidden from search."
                    : "You're anonymised."}
                </p>
                <p className="mt-0.5 text-amber-700 leading-relaxed">
                  {isHidden
                    ? "Recruiters can't surface you via the candidate database — they only see you if you apply directly."
                    : "Recruiters see your skills + history but not your name or photo until you advance past Stage 1."}{" "}
                  <Link
                    href="/student/settings"
                    className="font-semibold underline"
                  >
                    Change settings →
                  </Link>
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        <div className="grid lg:grid-cols-12 gap-5">
          {/* Left column: identity + saved jobs */}
          <div className="lg:col-span-4 space-y-5">
          {/* Identity card */}
          <GlassCard variant="strong" className="!p-6 space-y-4">
            <div className="flex items-center gap-3">
              {isAnon ? (
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-brand-ink/10 text-brand-ink">
                  👻
                </div>
              ) : (
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-brand-gradient text-white shadow-brand-glow font-display font-bold text-xl">
                  {user.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-display font-bold text-lg text-brand-ink line-clamp-1">
                  {isAnon ? `Anonymous · ID #${user.id.slice(-4)}` : user.name}
                </p>
                <p className="text-xs text-brand-muted">
                  {p.alias ?? user.email.split("@")[0]}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              {p.city && (
                <p className="flex items-center gap-2 text-brand-ink/85">
                  <MapPin size={13} className="text-brand-primary" />
                  {p.city}
                  {p.remotePref && ` · ${p.remotePref}`}
                </p>
              )}
              {!isAnon && (
                <>
                  <p className="flex items-center gap-2 text-brand-ink/85">
                    <Mail size={13} className="text-brand-primary" />
                    {p.contactEmail ?? user.email}
                  </p>
                  {p.contactPhone && (
                    <p className="flex items-center gap-2 text-brand-ink/85">
                      <Phone size={13} className="text-brand-primary" />
                      {p.contactPhone}
                    </p>
                  )}
                </>
              )}
              {p.yearsExperience !== undefined && (
                <p className="text-xs text-brand-muted mt-2">
                  {p.yearsExperience} year{p.yearsExperience === 1 ? "" : "s"}{" "}
                  of experience
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-brand-ink/5">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
                Trajectory
              </p>
              <GlassBadge
                tone={
                  p.trajectory === "actively_hunting" ? "success" : "brand"
                }
              >
                {TRAJ_LABEL[p.trajectory] ?? p.trajectory}
              </GlassBadge>
            </div>
          </GlassCard>

          {/* Saved jobs — moved here from the navbar */}
          <Link href="/student/saved" className="block">
            <GlassCard interactive className="!p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600">
                    <Bookmark size={16} />
                  </span>
                  <div>
                    <p className="font-display font-bold text-brand-ink">
                      Saved jobs
                    </p>
                    <p className="text-xs text-brand-muted">
                      {savedCount === 0
                        ? "Pin roles to revisit later"
                        : `${savedCount} pinned role${savedCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-brand-muted" />
              </div>
            </GlassCard>
          </Link>
          </div>

          {/* Skills + history */}
          <div className="lg:col-span-8 space-y-5">
            <GlassCard>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
                <Sparkles size={11} /> Skills · {p.skills.length}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.skills.map((s) => (
                  <span
                    key={s}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                      verified.has(s.toLowerCase())
                        ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                        : "bg-brand-ink/5 text-brand-ink/80"
                    }`}
                  >
                    {verified.has(s.toLowerCase()) && (
                      <CheckCircle2 size={10} className="inline mr-1" />
                    )}
                    {s}
                  </span>
                ))}
                {p.skills.length === 0 && (
                  <p className="text-sm text-brand-muted">
                    No skills on file yet —{" "}
                    <Link
                      href="/student/profile/edit"
                      className="text-brand-primary font-semibold"
                    >
                      add some →
                    </Link>
                  </p>
                )}
              </div>
              {p.verifiedSkills && p.verifiedSkills.length > 0 && (
                <p className="text-[11px] text-emerald-700 mt-3 font-semibold inline-flex items-center gap-1">
                  <Award size={11} /> {p.verifiedSkills.length} certified by
                  bootcamp completion
                </p>
              )}
            </GlassCard>

            <GlassCard>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
                <GraduationCap size={11} /> Work history
              </p>
              {p.history && p.history.length > 0 ? (
                <ul className="space-y-3">
                  {p.history.map((h) => (
                    <li
                      key={h.id}
                      className="border-l-2 border-brand-primary/40 pl-3"
                    >
                      <p className="font-display font-semibold text-sm text-brand-ink">
                        {h.title} · {h.company}
                      </p>
                      <p className="text-[11px] text-brand-muted">
                        {h.startDate} → {h.endDate}
                      </p>
                      <p className="text-sm text-brand-ink/85 mt-1 leading-relaxed">
                        {h.impact}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-brand-muted">
                  No work history yet —{" "}
                  <Link
                    href="/student/profile/edit"
                    className="text-brand-primary font-semibold"
                  >
                    add your roles →
                  </Link>
                </p>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </main>
  );
}
