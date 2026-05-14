"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Application, Job, Stage, User } from "@/lib/data/types";
import { Badge } from "@/components/arcade/Badge";
import { PixelButton } from "@/components/arcade/PixelButton";
import { slaCountdown } from "@/lib/utils/sla";
import { X, ChevronRight, Award, Brain, Sparkles } from "lucide-react";

interface Props {
  applications: Application[];
  jobs: Record<string, Job>;
  students: Record<string, User>;
}

const LANES: Array<{ stage: Stage; label: string; color: string }> = [
  { stage: "new_matches", label: "NEW MATCHES", color: "text-neon-blue" },
  { stage: "under_review", label: "UNDER REVIEW", color: "text-neon-yellow" },
  { stage: "interview", label: "INTERVIEW", color: "text-neon-pink" },
  { stage: "offer", label: "OFFER", color: "text-neon-green" },
];

export function KanbanBoard({ applications, jobs, students }: Props) {
  const [apps, setApps] = useState(applications);
  const [openId, setOpenId] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const m: Record<Stage, Application[]> = {
      new_matches: [],
      under_review: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };
    for (const a of apps) m[a.stage].push(a);
    return m;
  }, [apps]);

  async function advance(id: string, next: Stage, notes?: string) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, stage: next, outcomeNotes: notes ?? a.outcomeNotes } : a)));
    await fetch(`/api/applications/${id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: next, outcomeNotes: notes }),
    });
    setOpenId(null);
  }

  const open = apps.find((a) => a.id === openId);

  return (
    <>
      <div className="grid md:grid-cols-4 gap-4">
        {LANES.map((lane) => (
          <div key={lane.stage}>
            <div className="flex items-center justify-between mb-3">
              <p className={`font-pixel text-[10px] ${lane.color}`}>▸ {lane.label}</p>
              <Badge tone="muted">{byStage[lane.stage].length}</Badge>
            </div>
            <div className="space-y-3 min-h-[200px]">
              <AnimatePresence>
                {byStage[lane.stage].map((a) => (
                  <CandidateCard
                    key={a.id}
                    app={a}
                    job={jobs[a.jobId]}
                    student={students[a.studentId]}
                    onOpen={() => setOpenId(a.id)}
                  />
                ))}
              </AnimatePresence>
              {byStage[lane.stage].length === 0 && (
                <div className="border-2 border-dashed border-bg-ink p-4 text-center">
                  <p className="font-mono text-[10px] text-ink-dim">empty lane</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <ActionDrawer
            app={open}
            job={jobs[open.jobId]}
            student={students[open.studentId]}
            onClose={() => setOpenId(null)}
            onAdvance={(stage, notes) => advance(open.id, stage, notes)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function CandidateCard({
  app,
  job,
  student,
  onOpen,
}: {
  app: Application;
  job?: Job;
  student?: User;
  onOpen: () => void;
}) {
  const sla = slaCountdown(app.slaDeadline);
  const verified = (student?.profile?.verifiedSkills?.length ?? 0) > 0;
  const veteran = (student?.profile?.history?.length ?? 0) >= 2;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onOpen}
      className={`w-full text-left pixel-card p-3 hover:border-neon-blue transition-colors ${
        sla.pulse && !sla.expired ? "border-neon-yellow animate-pulse" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-pixel text-xs text-neon-pink truncate">{student?.name ?? "—"}</p>
        <span className="font-pixel text-[10px] text-neon-green">{app.matchPct}%</span>
      </div>
      <p className="font-mono text-[10px] text-ink-muted truncate mb-2">{job?.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {veteran && <Badge tone="purple"><Award size={10} /> Veteran</Badge>}
        {verified && <Badge tone="green"><Sparkles size={10} /> Verified</Badge>}
        {app.assessment?.grade && (
          <Badge tone={app.assessment.grade.score >= 75 ? "green" : app.assessment.grade.score >= 55 ? "yellow" : "red"}>
            <Brain size={10} /> {app.assessment.grade.score}
          </Badge>
        )}
      </div>
      <p className={`font-mono text-[9px] ${sla.expired ? "text-neon-red" : sla.pulse ? "text-neon-yellow" : "text-ink-dim"}`}>
        SLA {sla.label}
      </p>
    </motion.button>
  );
}

function ActionDrawer({
  app,
  job,
  student,
  onClose,
  onAdvance,
}: {
  app: Application;
  job?: Job;
  student?: User;
  onClose: () => void;
  onAdvance: (stage: Stage, notes?: string) => void;
}) {
  const next: Stage = app.stage === "new_matches" ? "under_review" : app.stage === "under_review" ? "interview" : app.stage === "interview" ? "offer" : "hired";
  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 240 }}
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-bg-panel border-l-2 border-neon-blue overflow-y-auto"
      >
        <div className="sticky top-0 bg-bg-panel border-b-2 border-bg-ink px-5 py-3 flex items-center justify-between">
          <div>
            <p className="font-pixel text-[10px] text-neon-blue">▸ ACTION DRAWER</p>
            <p className="font-pixel text-base text-neon-pink mt-1">{student?.name}</p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-neon-red"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="MATCH" value={`${app.matchPct}%`} color="green" />
            <Stat label="GRADE" value={app.assessment?.grade?.score ?? "—"} color="pink" />
            <Stat label="DEPTH" value={app.assessment?.grade?.depthSignal ?? "—"} color="blue" />
          </div>

          <div className="space-y-2">
            <p className="font-pixel text-[10px] text-neon-blue">▸ ABOUT</p>
            <p className="font-mono text-xs text-ink-muted">
              {student?.profile?.alias} · {student?.profile?.city ?? "—"} ·{" "}
              {student?.profile?.skills?.slice(0, 5).join(", ")}
            </p>
          </div>

          {app.assessment ? (
            <div className="grid md:grid-cols-2 gap-3">
              <div className="pixel-card p-4">
                <p className="font-pixel text-[10px] text-neon-yellow mb-2">▸ CANDIDATE RESPONSE</p>
                <p className="font-mono text-xs text-ink-primary whitespace-pre-wrap leading-relaxed">
                  {app.assessment.response}
                </p>
              </div>
              <div className="pixel-card p-4 border-neon-green">
                <p className="font-pixel text-[10px] text-neon-green mb-2">▸ AI GRADING NOTES</p>
                <p className="font-mono text-xs text-ink-primary leading-relaxed">
                  {app.assessment.grade?.notes}
                </p>
                <p className="font-pixel text-[10px] mt-3 text-ink-muted">
                  VERDICT: <span className="text-neon-green">{app.assessment.grade?.verdict?.toUpperCase()}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="font-mono text-xs text-ink-muted">No assessment yet — likely a passive applicant.</p>
          )}

          <div className="border-t-2 border-bg-ink pt-4 flex flex-wrap gap-2">
            <PixelButton variant="green" size="md" onClick={() => onAdvance(next)}>
              <ChevronRight size={14} /> Advance to {next === "under_review" ? "Review" : next === "interview" ? "Interview" : next === "offer" ? "Offer" : "Hire"}
            </PixelButton>
            <PixelButton variant="red" size="md" onClick={() => onAdvance("rejected", "Rejected with AI feedback")}>
              Reject with Feedback
            </PixelButton>
            <PixelButton variant="ghost" size="md" onClick={() => onAdvance(app.stage, "Sponsored bootcamp")}>
              Sponsor Bootcamp
            </PixelButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: "green" | "pink" | "blue" }) {
  const cls = color === "green" ? "text-neon-green" : color === "pink" ? "text-neon-pink" : "text-neon-blue";
  return (
    <div className="border-2 border-bg-ink p-3 bg-bg-base">
      <p className="font-mono text-[9px] text-ink-muted mb-1">{label}</p>
      <p className={`font-pixel text-2xl neon-text ${cls}`}>{value}</p>
    </div>
  );
}
