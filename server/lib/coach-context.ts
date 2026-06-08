/**
 * Builds a compact, factual snapshot of a student's real situation for the AI
 * Coach to ground its advice in — the same pattern as the route's `[catalog]`
 * block. DB-only (no LLM): profile, application pipeline + SLA status, recent
 * assessment outcomes, and the top open missions matched to them.
 *
 * Also derives a small set of deterministic deep-link `actions` from that same
 * real data (never model-invented), so the UI can offer one-tap next steps.
 */
import {
  getUserById,
  listApplicationsByStudent,
  listJobs,
} from "@/server/store";
import { computeMatchScore, skillDelta } from "@/server/lib/matching";

export interface CoachAction {
  label: string;
  href: string;
}

export interface CoachContext {
  /** One-line grounding summary injected into the model context. "" if empty. */
  text: string;
  /** Deterministic deep-link next steps derived from the student's real data. */
  actions: CoachAction[];
}

export async function buildCoachContext(
  studentId: string,
): Promise<CoachContext> {
  const [user, apps, jobs] = await Promise.all([
    getUserById(studentId),
    listApplicationsByStudent(studentId),
    listJobs(), // active jobs only (cached)
  ]);
  if (!user?.profile) return { text: "", actions: [] };
  const p = user.profile;
  const now = Date.now();
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const parts: string[] = [];
  const actions: CoachAction[] = [];

  // ── Skills + basics ──────────────────────────────────────────────
  const skills = p.skills ?? [];
  const verified = p.verifiedSkills ?? [];
  parts.push(
    `Skills: ${skills.length ? skills.join(", ") : "none listed"}${
      verified.length ? ` (verified: ${verified.join(", ")})` : ""
    }.`,
  );
  if (p.yearsExperience != null) {
    parts.push(`Experience: ${p.yearsExperience}y.`);
  }
  if (p.city || p.remotePref) {
    parts.push(
      `Location: ${p.city ?? "unspecified"}${
        p.remotePref ? `, prefers ${p.remotePref}` : ""
      }.`,
    );
  }

  // ── Application pipeline + SLA + recent fails ─────────────────────
  let breaching = 0;
  if (apps.length === 0) {
    parts.push("Has not applied to any missions yet.");
  } else {
    const stageCounts: Record<string, number> = {};
    const failed: string[] = [];
    for (const a of apps) {
      stageCounts[a.stage] = (stageCounts[a.stage] ?? 0) + 1;
      const awaiting = a.stage === "new_matches" || a.stage === "under_review";
      if (
        awaiting &&
        a.slaDeadline &&
        new Date(a.slaDeadline).getTime() < now &&
        !a.slaRefundIssued
      ) {
        breaching++;
      }
      const g = a.assessment?.grade;
      if (g && (g.verdict === "reject" || g.score < 55)) {
        const t = jobById.get(a.jobId)?.title;
        if (t) failed.push(t);
      }
    }
    const stageStr = Object.entries(stageCounts)
      .map(([s, n]) => `${n} ${s.replace(/_/g, " ")}`)
      .join(", ");
    parts.push(`Applications (${apps.length}): ${stageStr}.`);
    if (breaching > 0) {
      parts.push(
        `${breaching} application(s) past SLA with no recruiter response — eligible for an SLA credit.`,
      );
    }
    if (failed.length) {
      parts.push(
        `Recently didn't pass the assessment for: ${[...new Set(failed)]
          .slice(0, 3)
          .join(", ")}.`,
      );
    }
  }

  // ── Top open missions matched to them (deterministic, no LLM) ─────
  const appliedJobIds = new Set(apps.map((a) => a.jobId));
  const scored = jobs
    .filter((j) => j.active && !appliedJobIds.has(j.id))
    .map((j) => ({
      j,
      score: computeMatchScore(
        {
          skills,
          verifiedSkills: verified,
          yearsExperience: p.yearsExperience,
          remotePref: p.remotePref,
        },
        {
          skills: j.skills,
          experienceMin: j.experienceMin,
          experienceMax: j.experienceMax,
          remote: j.remote,
          location: j.location,
        },
      ),
      missing: skillDelta(skills, j.skills)
        .filter((d) => !d.has)
        .map((d) => d.skill),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (scored.length) {
    const lines = scored.map(
      ({ j, score, missing }) =>
        `"${j.title}" (${score}% match${
          missing.length ? `, missing ${missing.slice(0, 3).join(", ")}` : ""
        })`,
    );
    parts.push(`Top open missions for this student: ${lines.join("; ")}.`);
  }

  // ── Deterministic deep-link actions (built from the real data) ────
  if (breaching > 0) {
    actions.push({ label: "View my applications", href: "/student/applications" });
  }
  for (const { j } of scored.slice(0, 2)) {
    actions.push({ label: `Apply: ${j.title}`, href: `/missions/${j.id}` });
  }
  if (apps.length === 0 && scored.length === 0) {
    actions.push({ label: "Browse missions", href: "/student/jobs" });
  }

  return { text: parts.join(" "), actions };
}
