// Real Claude adapter via @anthropic-ai/sdk. Used when ANTHROPIC_API_KEY set.
//
// Default model: claude-haiku-4-5 — the cost-efficient tier. Roughly 60× cheaper
// than Opus 4.7 per token, with structured-output and instruction-following
// quality that comfortably handles every task in this app: resume parsing,
// match scoring, assessment grading, coach chat. Override per-call (or
// globally) via ANTHROPIC_MODEL env var if you ever need to escalate a
// specific flow to Sonnet or Opus.
//
// Falls back to the deterministic mock on any failure.
import Anthropic from "@anthropic-ai/sdk";
import type { AIAdapter } from "./index";
import { mockAdapter } from "./mock";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function jsonChat<T>(
  system: string,
  user: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const client = getClient();
  const params = {
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: { type: "json_schema", schema },
    },
    messages: [{ role: "user", content: user }],
  } as never;
  const resp = await client.messages.create(params);
  const textBlock = resp.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no text in claude response");
  return JSON.parse(textBlock.text) as T;
}

export const claudeAdapter: AIAdapter = {
  async parseResume(rawText) {
    try {
      return await jsonChat(
        "You are a resume parser. Return strict JSON matching the schema. Be precise; do not invent facts.",
        `Parse this resume:\n\n${rawText.slice(0, 8000)}`,
        {
          type: "object",
          additionalProperties: false,
          properties: {
            alias: { type: "string" },
            contactEmail: { type: "string" },
            contactPhone: { type: "string" },
            city: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            history: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  company: { type: "string" },
                  startDate: { type: "string" },
                  endDate: { type: "string" },
                  impact: { type: "string" },
                },
                required: ["title", "company", "startDate", "endDate", "impact"],
              },
            },
          },
          required: ["alias", "contactEmail", "skills", "history"],
        },
      );
    } catch {
      return mockAdapter.parseResume(rawText);
    }
  },

  async matchScore(profile, job) {
    try {
      return await jsonChat(
        "You score how well a candidate matches a job. Return integer matchPct (0-100) and one-sentence reasoning. Be calibrated; 90+ should be rare.",
        `Candidate skills: ${profile.skills.join(", ")}\nJob skills: ${job.skills.join(", ")}\nJob title: ${job.title}`,
        {
          type: "object",
          additionalProperties: false,
          properties: {
            matchPct: { type: "integer" },
            reasoning: { type: "string" },
          },
          required: ["matchPct", "reasoning"],
        },
      );
    } catch {
      return mockAdapter.matchScore(profile, job);
    }
  },

  async whyMatch(profile, job) {
    // PRD: 3-sentence personalised summary card. Phase 1 delegate to mock.
    // Real Claude impl will use jsonChat with structured schema mirroring WhyMatchResult.
    return mockAdapter.whyMatch(profile, job);
  },

  async draftMessage(ctx) {
    // Phase 1 delegate. Real Claude impl: jsonChat with prompt that includes
    // recentMessages + senderRole + intent. Returns a single string body.
    return mockAdapter.draftMessage(ctx);
  },

  async gradeAssessment(prompt, response, job) {
    try {
      return await jsonChat(
        "You are a hiring assessment grader. Score 0-100 on signal quality: depth of reasoning, evidence of real experience, explicit trade-offs. Return verdict: advance (>=75), borderline (55-74), reject (<55). depthSignal is 0-100.",
        `Job: ${job.title}\nPrompt: ${prompt}\n\nCandidate response:\n${response}`,
        {
          type: "object",
          additionalProperties: false,
          properties: {
            score: { type: "integer" },
            notes: { type: "string" },
            verdict: { type: "string", enum: ["advance", "reject", "borderline"] },
            depthSignal: { type: "integer" },
          },
          required: ["score", "notes", "verdict", "depthSignal"],
        },
      );
    } catch {
      return mockAdapter.gradeAssessment(prompt, response, job);
    }
  },

  async chatCoach(history, profile) {
    try {
      const client = getClient();
      const sysText = `You are the NoGhost AI Coach. Help students navigate the site (Terminal dashboard, Mission briefs, Assessments, Bootcamps) and give honest career advice. Keep replies under 80 words. Always end with 2-3 short follow-up suggestions the user might tap. NEVER invent course, bootcamp, or product names — only reference bootcamps explicitly listed in the conversation context (look for a [catalog] note); if none fit, say unGhost doesn't have one yet.${profile ? ` Student skills: ${profile.skills.join(", ")}.` : ""}`;
      const params = {
        model: MODEL,
        max_tokens: 800,
        system: [{ type: "text", text: sysText, cache_control: { type: "ephemeral" } }],
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                message: { type: "string" },
                suggestions: { type: "array", items: { type: "string" } },
              },
              required: ["message", "suggestions"],
            },
          },
        },
        messages: history.map((m) => ({
          role: m.role === "coach" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
      } as never;
      const resp = await client.messages.create(params);
      const t = resp.content.find((b) => b.type === "text");
      if (!t || t.type !== "text") throw new Error("no text");
      return JSON.parse(t.text);
    } catch {
      return mockAdapter.chatCoach(history, profile);
    }
  },

  async parseJD(jdText) {
    try {
      return await jsonChat(
        "You are a job-description parser for a hiring platform. Extract canonical fields. Generate one short Gauntlet prompt: a 2-3 sentence situational question the candidate must answer in writing. Salaries in INR LPA (Indian lakh per annum, integer 5-200).",
        jdText,
        {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            gauntletPrompt: { type: "string" },
            description: { type: "string" },
            salaryMin: { type: "integer" },
            salaryMax: { type: "integer" },
          },
          required: ["title", "skills", "gauntletPrompt", "description", "salaryMin", "salaryMax"],
        },
      );
    } catch {
      return mockAdapter.parseJD(jdText);
    }
  },

  // ─── Bootcamp Learning ───────────────────────────────────────────────────
  // For Phase 1 we delegate to mock for these. Real Claude implementations
  // follow the same jsonChat pattern; flip-on when ANTHROPIC_API_KEY is set
  // and the prompts have been tuned against real lesson content.

  async chatTutor(history, ctx) {
    try {
      const sysText = `You are the unGhost AI Tutor for the bootcamp "${ctx.bootcamp.title}" (skill: ${ctx.bootcamp.skill}). Lesson context: ${ctx.video?.title ?? "module overview"}. You can: explain concepts, reference video timestamps, quiz the student, summarize, give analogies. You MUST refuse: career advice (redirect to AI Coach), assignment answers, skill-check answers. Reply under 80 words. End with 2-3 short follow-up suggestions.`;
      const resp = (await jsonChat(
        sysText,
        history
          .map((m) => `${m.role === "tutor" ? "Tutor" : "Student"}: ${m.content}`)
          .join("\n"),
        {
          type: "object",
          additionalProperties: false,
          properties: {
            message: { type: "string" },
            suggestions: { type: "array", items: { type: "string" } },
          },
          required: ["message", "suggestions"],
        },
      )) as { message: string; suggestions: string[] };
      return resp;
    } catch {
      return mockAdapter.chatTutor(history, ctx);
    }
  },

  async gradeSkillCheck(answers, questions) {
    // Skill check grading combines deterministic MCQ marking with rubric-based
    // short-answer grading. Per PRD the rubric calls are individual Claude
    // calls for focus. For Phase 1 we delegate to mock — when the key is set,
    // real impl will iterate per question and use jsonChat with rubric prompts.
    return mockAdapter.gradeSkillCheck(answers, questions);
  },

  async gradeAssignment(submission, rubric) {
    // Per PRD: one Claude call per rubric criterion + plagiarism + AI-detection.
    // ~$0.04 total. Phase 1: delegate to mock until real key is in.
    return mockAdapter.gradeAssignment(submission, rubric);
  },
};
