// Deterministic mock AI — works offline. Plausible responses for every flow.
import type { AIAdapter } from "./index";
import { computeMatchPct, depthScore } from "@/lib/utils/matching";

const SKILL_BANK = [
  "Python",
  "TypeScript",
  "React",
  "Next.js",
  "FastAPI",
  "Go",
  "Kubernetes",
  "Postgres",
  "LLM Grounding",
  "Prompt Eng",
  "LangChain",
  "Vector DB",
  "Product Strategy",
  "User Research",
  "Design Systems",
  "GraphQL",
  "PyTorch",
  "Statistics",
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = SKILL_BANK.filter((s) => lower.includes(s.toLowerCase()));
  return hits.length > 0 ? hits : ["Python", "FastAPI", "LLM Grounding"];
}

function pickAlias(text: string): string {
  const firstLine = text.split("\n").map((s) => s.trim()).filter(Boolean)[0] ?? "candidate.x";
  return firstLine
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 28) || "candidate.x";
}

export const mockAdapter: AIAdapter = {
  async parseResume(rawText) {
    await new Promise((r) => setTimeout(r, 1100));
    const skills = extractSkills(rawText);
    return {
      alias: pickAlias(rawText),
      contactEmail: "you@yourdomain.com",
      contactPhone: "+91 98xxxxxxxx",
      city: "Bengaluru",
      skills,
      history: [
        {
          title: "Senior Engineer",
          company: "Previous Co",
          startDate: "2022-08",
          endDate: "Present",
          impact:
            "Shipped a core platform service used by every internal product team. Drove a measurable reliability win that survived two quarters of growth.",
        },
        {
          title: "Engineer",
          company: "Earlier Co",
          startDate: "2020-06",
          endDate: "2022-07",
          impact:
            "Owned the migration from a legacy stack onto a typed, observable foundation. Reduced incident frequency and grew the team's bench depth.",
        },
      ],
    };
  },

  async matchScore(profile, job) {
    await new Promise((r) => setTimeout(r, 350));
    const pct = computeMatchPct(profile.skills, job.skills);
    const missing = job.skills.filter(
      (s) => !profile.skills.map((p) => p.toLowerCase()).includes(s.toLowerCase()),
    );
    const reasoning = missing.length
      ? `Strong overlap on ${job.skills.length - missing.length} of ${job.skills.length} non-negotiables. Gaps: ${missing.join(", ")}.`
      : `Full skill coverage. Differentiation will come from the Gauntlet response.`;
    return { matchPct: pct, reasoning };
  },

  async gradeAssessment(prompt, response, job) {
    await new Promise((r) => setTimeout(r, 900));
    const depth = depthScore(response);
    const lowerR = response.toLowerCase();
    const evidenceHits = ["because", "specifically", "metric", "tradeoff", "trade-off", "experiment", "shadow", "rollout"]
      .filter((w) => lowerR.includes(w)).length;
    const overlapBoost = job.skills.filter((s) => lowerR.includes(s.toLowerCase())).length * 3;
    const score = Math.max(20, Math.min(98, 40 + depth * 0.4 + evidenceHits * 4 + overlapBoost));
    const verdict: "advance" | "reject" | "borderline" =
      score >= 75 ? "advance" : score >= 55 ? "borderline" : "reject";
    const notes =
      verdict === "advance"
        ? `Strong response. Names trade-offs explicitly and grounds the plan in evidence (depth ${depth}). Clear advance.`
        : verdict === "borderline"
          ? `Plausible but light on proof discipline. Worth a 30-min screen if pipeline is thin (depth ${depth}).`
          : `Reach-for-knobs answer; lacks separation of failure modes and proof of fix. Reject with the LLM Grounding bootcamp recommendation.`;
    return {
      score: Math.round(score),
      notes,
      verdict,
      depthSignal: depth,
    };
  },

  async chatCoach(history, profile) {
    await new Promise((r) => setTimeout(r, 600));
    const last = history[history.length - 1]?.content.toLowerCase() ?? "";
    if (last.includes("dashboard") || last.includes("where")) {
      return {
        message:
          "Your Active Missions are on the left of the Terminal. The Matchmaker Feed in the center shows jobs ranked by match %. Click any card to see the Skill Delta and take the assessment.",
        suggestions: ["What's an SLA?", "Show me my strongest match", "Should I upskill first?"],
      };
    }
    if (last.includes("sla")) {
      return {
        message:
          "SLA = the response promise the recruiter signs at job-post time. 24h, 48h, or 72h. Miss it and the recruiter's listing gets ghost-rated. You always see the countdown.",
        suggestions: ["What if they miss it?", "How do I improve my match %?"],
      };
    }
    if (last.includes("upskill") || last.includes("bootcamp")) {
      const skills = profile?.skills.length ?? 0;
      return {
        message: `You have ${skills} skills on your profile. Most candidates who get advanced have at least one *verified* skill. The fastest path is the LLM Grounding bootcamp — 3 weeks, one live session.`,
        suggestions: ["Show me bootcamps", "How much does it cost?", "Take me to a mission"],
      };
    }
    return {
      message:
        "I'm your AI Coach. Ask me anything — what to apply for, how to improve your match %, what an SLA is, where things are on this site, or whether to take a bootcamp before applying.",
      suggestions: ["What should I apply for?", "Where do I find my missions?", "Explain SLAs"],
    };
  },

  async parseJD(jdText) {
    await new Promise((r) => setTimeout(r, 1100));
    const skills = extractSkills(jdText);
    const titleGuess =
      jdText.match(/(senior |staff |principal )?(.{0,30}?(engineer|manager|scientist|designer|owner|lead))/i)?.[0]?.trim() ??
      "Engineer";
    return {
      title: titleGuess.replace(/\s+/g, " "),
      skills,
      gauntletPrompt:
        "Pick the single hardest decision you'd face in the first 60 days. Describe the trade-off you'd consciously accept, what you'd ship first, and how you'd measure whether the bet paid off.",
      description: jdText.trim().slice(0, 600),
      salaryMin: 30,
      salaryMax: 50,
    };
  },
};
