import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/arcade/Badge";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { SectionHeader } from "@/components/arcade/SectionHeader";
import {
  getUserById,
  listApplicationsByStudent,
  listBootcamps,
  listJobs,
  listCompanies,
} from "@/lib/data/store";
import { ArrowLeft, Calendar, GraduationCap, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";

export default function StudentDeepView({ params }: { params: { id: string } }) {
  const u = getUserById(params.id);
  if (!u || u.role !== "student") notFound();

  const apps = listApplicationsByStudent(u.id);
  const allJobs = listJobs();
  const allCo = listCompanies();
  const allBC = listBootcamps();
  const enrolledBC = allBC.filter((b) => b.enrolledStudentIds.includes(u.id));

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <Link href="/admin/students" className="font-mono text-xs text-neon-blue inline-flex items-center gap-1">
        <ArrowLeft size={12} /> Back to roster
      </Link>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Profile column */}
        <ArcadeCard className="lg:col-span-1">
          <SectionHeader eyebrow="STUDENT" title={u.name} color="pink" />
          <p className="font-mono text-xs text-ink-muted mt-2">{u.profile?.alias}</p>
          <div className="mt-4 space-y-2 font-mono text-xs">
            <p className="flex items-center gap-2"><Mail size={12} className="text-neon-blue" /> {u.profile?.contactEmail}</p>
            {u.profile?.contactPhone && <p className="flex items-center gap-2"><Phone size={12} className="text-neon-blue" /> {u.profile.contactPhone}</p>}
            {u.profile?.city && <p className="flex items-center gap-2"><MapPin size={12} className="text-neon-blue" /> {u.profile.city} · {u.profile.remotePref}</p>}
            <p className="flex items-center gap-2"><Calendar size={12} className="text-neon-blue" /> Joined {new Date(u.profile?.joinedAt ?? "").toLocaleDateString("en-IN")}</p>
          </div>
          <p className="font-pixel text-[10px] text-ink-muted mt-4 mb-2">▸ TRAJECTORY</p>
          <Badge tone={u.profile?.trajectory === "actively_hunting" ? "green" : "blue"}>{u.profile?.trajectory}</Badge>
          <p className="font-pixel text-[10px] text-ink-muted mt-4 mb-2">▸ SKILLS</p>
          <div className="flex flex-wrap gap-1">
            {u.profile?.skills.map((s) => (
              <Badge key={s} tone={u.profile?.verifiedSkills.includes(s) ? "green" : "muted"}>
                {u.profile?.verifiedSkills.includes(s) && <ShieldCheck size={10} />} {s}
              </Badge>
            ))}
          </div>
        </ArcadeCard>

        {/* Activity */}
        <div className="lg:col-span-2 space-y-4">
          <ArcadeCard>
            <p className="font-pixel text-[10px] text-neon-yellow mb-3 flex items-center gap-2"><GraduationCap size={12} /> BOOTCAMP ENROLLMENT</p>
            {enrolledBC.length === 0 ? (
              <p className="font-mono text-xs text-ink-muted">Not enrolled in any bootcamps yet.</p>
            ) : (
              <ul className="space-y-2">
                {enrolledBC.map((b) => (
                  <li key={b.id} className="flex items-center justify-between border-2 border-bg-ink px-3 py-2">
                    <div>
                      <p className="font-pixel text-xs text-neon-yellow">{b.title}</p>
                      <p className="font-mono text-[10px] text-ink-muted">{b.skill} · {b.durationWeeks}w · ₹{b.priceINR.toLocaleString("en-IN")}</p>
                    </div>
                    {u.profile?.verifiedSkills.includes(b.skill) && (
                      <Badge tone="green"><Sparkles size={10} /> VERIFIED</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ArcadeCard>

          <ArcadeCard>
            <p className="font-pixel text-[10px] text-neon-pink mb-3">▸ APPLICATIONS · {apps.length}</p>
            {apps.length === 0 ? (
              <p className="font-mono text-xs text-ink-muted">No applications submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => {
                  const j = allJobs.find((x) => x.id === a.jobId);
                  const co = allCo.find((x) => x.id === j?.companyId);
                  return (
                    <div key={a.id} className="border-2 border-bg-ink p-3">
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                        <div>
                          <p className="font-pixel text-xs text-neon-pink">{j?.title}</p>
                          <p className="font-mono text-[10px] text-ink-muted">{co?.name} · applied {new Date(a.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge tone="blue">Match {a.matchPct}%</Badge>
                          <Badge tone={a.stage === "rejected" ? "red" : a.stage === "offer" || a.stage === "hired" ? "green" : "yellow"}>
                            {a.stage.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      {a.assessment?.grade && (
                        <p className="font-mono text-[11px] text-ink-muted leading-relaxed">
                          <span className="text-neon-yellow">GRADE {a.assessment.grade.score}</span> · {a.assessment.grade.notes}
                        </p>
                      )}
                      {a.interviewScheduledAt && (
                        <p className="font-mono text-[10px] text-neon-pink mt-1">
                          INTERVIEW · {new Date(a.interviewScheduledAt).toLocaleString("en-IN")}
                        </p>
                      )}
                      {a.outcomeNotes && (
                        <p className="font-mono text-[10px] text-ink-dim mt-1">▸ {a.outcomeNotes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ArcadeCard>

          <ArcadeCard>
            <p className="font-pixel text-[10px] text-neon-blue mb-3">▸ WORK HISTORY</p>
            <div className="space-y-3">
              {u.profile?.history.map((h) => (
                <div key={h.id} className="border-l-2 border-neon-blue pl-3">
                  <p className="font-pixel text-xs text-neon-blue">{h.title} · {h.company}</p>
                  <p className="font-mono text-[10px] text-ink-muted">{h.startDate} → {h.endDate}</p>
                  <p className="font-mono text-xs text-ink-primary mt-1 leading-relaxed">{h.impact}</p>
                </div>
              ))}
            </div>
          </ArcadeCard>
        </div>
      </div>
    </div>
  );
}
