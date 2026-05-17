// Deterministic mock AI — works offline. Plausible responses for every flow.
import type {
  AIAdapter,
  AssignmentGrade,
  AssignmentRubricCriterion,
  AssignmentSubmission,
  DraftMessageContext,
  SkillCheckGrade,
  SkillCheckQuestion,
  TutorReply,
} from "./index";
import type { Bootcamp, BootcampVideo } from "@/shared/types";
import { computeMatchPct, depthScore } from "@/server/lib/matching";

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

  async whyMatch(profile, job) {
    await new Promise((r) => setTimeout(r, 400));
    const studentLow = profile.skills.map((s) => s.toLowerCase());
    const verified = new Set(
      profile.verifiedSkills.map((s) => s.toLowerCase()),
    );
    const overlap = job.skills.filter((s) =>
      studentLow.includes(s.toLowerCase()),
    );
    const missing = job.skills.filter(
      (s) => !studentLow.includes(s.toLowerCase()),
    );
    const verifiedOverlap = overlap.filter((s) =>
      verified.has(s.toLowerCase()),
    );
    const recentRole = profile.history?.[0];

    const sentences: string[] = [];
    sentences.push(
      `Your profile covers ${overlap.length} of ${job.skills.length} core skills for this mission${
        verifiedOverlap.length > 0
          ? `, including ${verifiedOverlap.length} verified by bootcamp`
          : ""
      }.`,
    );
    if (recentRole) {
      sentences.push(
        `Your last role at ${recentRole.company} (${recentRole.title}) lines up with the ${job.title.toLowerCase()} mandate.`,
      );
    } else {
      sentences.push(
        `The Gauntlet will be your main signal — your work history is thin, so depth and trade-off naming will matter most.`,
      );
    }
    if (missing.length > 0) {
      sentences.push(
        `Watch for ${missing.slice(0, 2).join(" and ")} — recruiters will probe there.`,
      );
    } else {
      sentences.push(
        `No skill gaps detected. Time to make your case in the Gauntlet.`,
      );
    }

    const strengths: string[] = [];
    if (verifiedOverlap.length > 0)
      strengths.push(`Verified: ${verifiedOverlap.join(", ")}`);
    if (overlap.length > 2)
      strengths.push(`Wide coverage on required stack`);
    if ((profile.history?.length ?? 0) >= 2)
      strengths.push(`Multi-role track record`);
    if (strengths.length === 0) strengths.push(`Active learning trajectory`);

    const risks: string[] = [];
    if (missing.length > 0)
      risks.push(`Missing: ${missing.slice(0, 3).join(", ")}`);
    if (verifiedOverlap.length === 0)
      risks.push(`No verified-skill badges yet — bootcamp can fix this`);
    if ((profile.history?.length ?? 0) === 0)
      risks.push(`No prior roles on profile`);

    return {
      summary: sentences.join(" "),
      strengths,
      risks,
    };
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

  async draftMessage(ctx: DraftMessageContext): Promise<string> {
    await new Promise((r) => setTimeout(r, 450));
    const greet = ctx.recipientName ? `Hi ${ctx.recipientName.split(" ")[0]},` : "Hi,";
    const job = ctx.jobTitle ? ` for ${ctx.jobTitle}` : "";
    const company = ctx.companyName ? ` at ${ctx.companyName}` : "";

    // If we have recent messages, lightly echo the last one.
    const lastFromOther = (ctx.recentMessages ?? [])
      .slice()
      .reverse()
      .find((m) => m.role !== ctx.senderRole);

    if (ctx.senderRole === "recruiter") {
      if (ctx.intent === "schedule_interview" || /interview|chat|call/i.test(lastFromOther?.body ?? "")) {
        return `${greet}\n\nThanks for the strong submission${job}. Would Tuesday 11 AM or Wednesday 3 PM IST work for a 30-min screen? Happy to share the role's scope + comp upfront.\n\nLooking forward,`;
      }
      if (ctx.intent === "decline" || /decline|reject/i.test(ctx.intent ?? "")) {
        return `${greet}\n\nWe really appreciated your application${job}. We're moving forward with profiles closer to the seniority bar we set, but your trade-off framing was sharp. Hope to cross paths again.\n\nBest,`;
      }
      return `${greet}\n\nYour profile lines up well with what we're hiring for${job}${company}. Quick 15-min intro this week?\n\nLet me know what works.`;
    }

    // student
    if (ctx.intent === "follow_up" || (lastFromOther && /interview/i.test(lastFromOther.body))) {
      return `${greet}\n\nThanks for the note. Tuesday 11 AM IST works for me. I'll come ready with two specific situations from my last role and the trade-offs I'd make in this one.\n\nLooking forward to chatting.\n\nBest,`;
    }
    if (ctx.intent === "negotiate_offer") {
      return `${greet}\n\nThanks for the offer — I'm seriously considering it. Based on my market research and the scope we discussed, I'd love to align on the comp band${job}. Could we explore a small bump on the base + a clearer equity story? Happy to share competing data points if useful.\n\nBest,`;
    }
    return `${greet}\n\nAppreciate you reaching out${company}. I'd be glad to learn more about the role and your team. Quick call later this week?\n\nThanks,`;
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

  async chatTutor(history, ctx): Promise<TutorReply> {
    await new Promise((r) => setTimeout(r, 500));
    const last = history[history.length - 1]?.content.toLowerCase() ?? "";
    const lessonName = ctx.video?.title ?? ctx.bootcamp.title;
    // Guardrails per PRD
    if (last.match(/answer|solution|what (is|are) the answer/)) {
      return {
        message:
          "I can't give you skill-check answers — that defeats the verification. But I can re-explain any concept or quiz you on it. Want me to walk you through the underlying idea?",
        suggestions: ["Re-explain the main concept", "Quiz me", "Give me an analogy"],
      };
    }
    if (last.includes("career") || last.includes("salary") || last.includes("job")) {
      return {
        message:
          "That's a career question — your AI Coach handles those (top-right of the dashboard, or /student/coach). I focus on the lesson content. Want help understanding something in this video?",
        suggestions: ["Summarize this video", "Quiz me", "Give an example"],
      };
    }
    if (last.includes("summarize") || last.includes("summary") || last.includes("recap")) {
      return {
        message: `Here's the core of "${lessonName}": the lesson centers on ${ctx.bootcamp.skill} fundamentals — the trade-offs, when to apply each technique, and the verification pattern at the end. Key concept to remember: precision over coverage. Re-watch around 4:30 if you want the worked example.`,
        suggestions: ["Quiz me on this", "Explain the worked example", "Give an analogy"],
      };
    }
    if (last.includes("quiz") || last.includes("test me")) {
      return {
        message: `Quick check: if you had to apply ${ctx.bootcamp.skill} to a real production problem tomorrow, what's the *first* thing you'd verify before writing any code? (No wrong answer — I'm checking your instinct.)`,
        suggestions: ["I'd verify the data", "I'd write a small prototype", "Show me the answer"],
      };
    }
    if (last.includes("analogy") || last.includes("example")) {
      return {
        message: `Think of ${ctx.bootcamp.skill} like a sieve — you're not trying to keep everything, you're tuning what falls through. The lesson's key example shows how a tighter sieve cuts noise 3x but also loses a small percentage of valid hits. Trade-off is the whole game.`,
        suggestions: ["Show me another example", "Quiz me", "Why does that matter?"],
      };
    }
    return {
      message: `I'm your AI Tutor for "${ctx.bootcamp.title}". I can explain concepts from the current video, quiz you, summarise, or give analogies. I won't give skill-check answers or career advice — for that, see AI Coach.`,
      suggestions: ["Summarize this video", "Quiz me", "Give an analogy"],
    };
  },

  async gradeSkillCheck(answers, questions): Promise<SkillCheckGrade> {
    await new Promise((r) => setTimeout(r, 700));
    const perQuestion = questions.map((q) => {
      const a = answers.find((x) => x.questionId === q.id);
      if (q.type === "mcq") {
        const correct = a && a.answer === q.correctIdx;
        return {
          questionId: q.id,
          correct: !!correct,
          feedback: correct
            ? "Correct."
            : "Not quite — re-watch the video around the worked example.",
        };
      }
      // short answer: heuristic — judge length + keyword match
      const txt = String(a?.answer ?? "").toLowerCase();
      const rubric = (q.rubric ?? "").toLowerCase();
      const tokens = rubric
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 3)
        .slice(0, 6);
      const hits = tokens.filter((t) => txt.includes(t)).length;
      const correct = txt.length >= 40 && hits >= Math.max(1, Math.ceil(tokens.length / 3));
      return {
        questionId: q.id,
        correct,
        feedback: correct
          ? "Solid — you hit the key idea."
          : "Stretch your answer further. Reference the specific concept from the lesson and explain *why* it matters.",
      };
    });
    const correctCount = perQuestion.filter((p) => p.correct).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 70;
    return {
      score,
      passed,
      perQuestion,
      summary: passed
        ? `Strong pass — ${correctCount}/${questions.length} correct. You've earned this module's checkpoint.`
        : `Close — ${correctCount}/${questions.length} correct, ${score}% (need 70%). Re-watch the timestamps suggested in feedback and retry in 30 min.`,
    };
  },

  async gradeAssignment(
    submission: AssignmentSubmission,
    rubric: AssignmentRubricCriterion[],
  ): Promise<AssignmentGrade> {
    await new Promise((r) => setTimeout(r, 1400));
    const writeup = submission.writeup.toLowerCase();
    const reflection = submission.reflection.toLowerCase();
    const wordCount = submission.writeup.split(/\s+/).filter(Boolean).length;
    const reflWords = submission.reflection.split(/\s+/).filter(Boolean).length;

    // Per-criterion heuristic scoring (out of 20 each, 5 criteria = 100)
    const perCriterion = rubric.map((c) => {
      const key = c.key.toLowerCase();
      let s = 12; // baseline
      if (key.includes("depth") || key.includes("conceptual")) {
        s += Math.min(6, Math.floor(wordCount / 100));
        if (/because|therefore|specifically|trade.?off|implication/.test(writeup)) s += 2;
      } else if (key.includes("practical") || key.includes("application")) {
        if (/example|implement|deploy|in production|real world/.test(writeup)) s += 4;
        if (submission.fileNames && submission.fileNames.length > 0) s += 2;
      } else if (key.includes("clarity") || key.includes("communication")) {
        const para = submission.writeup.split(/\n\n+/).length;
        s += Math.min(6, para * 1.2);
      } else if (key.includes("original")) {
        if (wordCount > 400) s += 4;
        if (/i think|in my view|my approach|i chose/.test(writeup)) s += 2;
      } else if (key.includes("reflection")) {
        s += Math.min(6, Math.floor(reflWords / 40));
        if (/learned|surprised|next time|would have/.test(reflection)) s += 2;
      }
      const score = Math.max(0, Math.min(20, s));
      return {
        key: c.key,
        score,
        feedback:
          score >= 16
            ? `Strong on ${c.label.toLowerCase()} — concrete and specific.`
            : score >= 12
              ? `${c.label} is adequate. Push for one more concrete example or trade-off.`
              : `${c.label} needs work — broaden depth and ground in the lesson's framework.`,
      };
    });

    const totalScore = perCriterion.reduce((sum, c) => sum + c.score, 0);
    const strengths = perCriterion
      .filter((c) => c.score >= 16)
      .map((c) => rubric.find((r) => r.key === c.key)?.label ?? c.key)
      .slice(0, 3);
    const improvements = perCriterion
      .filter((c) => c.score < 14)
      .map((c) => rubric.find((r) => r.key === c.key)?.label ?? c.key)
      .slice(0, 3);

    // Naive plagiarism / AI-generated checks
    const looksAI =
      /furthermore|in conclusion|it is important to note|moreover/.test(writeup) &&
      wordCount > 200;
    return {
      totalScore,
      perCriterion,
      strengths: strengths.length ? strengths : ["Clear structure"],
      improvements: improvements.length ? improvements : ["Add one more concrete example"],
      plagiarismFlag: false,
      aiGeneratedLikelihood: looksAI ? 72 : 18,
    };
  },
};
