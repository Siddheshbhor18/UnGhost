// Real Gemini adapter via @google/generative-ai.
//
// Default model: gemini-2.5-flash — cost-efficient tier. ~$0.30/M in,
// $2.50/M out — roughly half of Claude Haiku 4.5 for our workload, with
// equivalent quality on resume parse / match score / coach / grading.
//
// Selected when `GOOGLE_AI_API_KEY` is set in env (takes priority over
// ANTHROPIC_API_KEY — see ai/index.ts). Falls back to the deterministic
// mock on any failure so the UI never crashes.
//
// Override the model per-env via `GOOGLE_AI_MODEL` (e.g. set to
// `gemini-2.5-pro` for a specific staging experiment).
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIAdapter } from "./index";
import { mockAdapter } from "./mock";

const MODEL = process.env.GOOGLE_AI_MODEL ?? "gemini-2.5-flash";

function getClient() {
  return new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");
}

/**
 * One-shot structured JSON generation. Gemini's responseSchema enforces the
 * shape at decode time, so the returned text is already valid JSON matching
 * the schema — no streaming parse / repair needed.
 */
async function jsonChat<T>(
  system: string,
  user: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const model = getClient().getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      // Gemini accepts the standard JSON-schema dialect for responseSchema.
      // Field names ("type", "properties", etc.) match what we use for Claude.
      responseSchema: schema as never,
      maxOutputTokens: 4000,
    },
  });
  const resp = await model.generateContent(user);
  const text = resp.response.text();
  if (!text) throw new Error("empty gemini response");
  return JSON.parse(text) as T;
}

export const geminiAdapter: AIAdapter = {
  async parseResume(rawText) {
    try {
      return await jsonChat(
        "You are a resume parser. Return strict JSON matching the schema. Be precise; do not invent facts.",
        `Parse this resume:\n\n${rawText.slice(0, 8000)}`,
        {
          type: "object",
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
        `Candidate skills: ${profile.skills.join(", ")}\nJob skills: ${job.skills.join(
          ", ",
        )}\nJob title: ${job.title}`,
        {
          type: "object",
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
    try {
      return await jsonChat(
        "You are explaining to a student why they match a job. Return a 3-sentence summary, 2-4 standout strengths (verified skills first), and 2-3 risks phrased as actionable gaps. Keep it honest, never inflate.",
        `Candidate: skills=${profile.skills.join(", ")}, verified=${profile.verifiedSkills.join(
          ", ",
        )}, trajectory=${profile.trajectory}.\nJob: ${job.title}, skills=${job.skills.join(", ")}.`,
        {
          type: "object",
          properties: {
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "strengths", "risks"],
        },
      );
    } catch {
      return mockAdapter.whyMatch(profile, job);
    }
  },

  async draftMessage(ctx) {
    try {
      const sys = `You draft the first message between a ${ctx.senderRole} and the other side on a hiring platform. Tone: warm but professional, India-context, under 60 words. No emojis. End with a clear ask.`;
      const lines: string[] = [];
      if (ctx.recipientName) lines.push(`Recipient: ${ctx.recipientName}`);
      if (ctx.jobTitle) lines.push(`Job: ${ctx.jobTitle}`);
      if (ctx.companyName) lines.push(`Company: ${ctx.companyName}`);
      if (ctx.intent) lines.push(`Intent: ${ctx.intent}`);
      if (ctx.recentMessages?.length) {
        lines.push("Recent thread:");
        for (const m of ctx.recentMessages.slice(-4)) {
          lines.push(`  ${m.role}: ${m.body}`);
        }
      }
      const result = await jsonChat<{ body: string }>(
        sys,
        lines.join("\n"),
        {
          type: "object",
          properties: { body: { type: "string" } },
          required: ["body"],
        },
      );
      return result.body;
    } catch {
      return mockAdapter.draftMessage(ctx);
    }
  },

  async gradeAssessment(prompt, response, job) {
    try {
      return await jsonChat(
        "You are a hiring assessment grader. Score 0-100 on signal quality: depth of reasoning, evidence of real experience, explicit trade-offs. Return verdict: advance (>=75), borderline (55-74), reject (<55). depthSignal is 0-100.",
        `Job: ${job.title}\nPrompt: ${prompt}\n\nCandidate response:\n${response}`,
        {
          type: "object",
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
      const sysText = `You are the unGhost AI Coach. Help students navigate the site (Terminal dashboard, Mission briefs, Assessments, Bootcamps) and give honest career advice. Keep replies under 80 words. Always end with 2-3 short follow-up suggestions the user might tap. NEVER invent course, bootcamp, or product names — only reference bootcamps explicitly listed in the conversation context (look for a [catalog] note); if none fit, say unGhost doesn't have one yet.${
        profile ? ` Student skills: ${profile.skills.join(", ")}.` : ""
      }`;
      const model = getClient().getGenerativeModel({
        model: MODEL,
        systemInstruction: sysText,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              message: { type: "string" },
              suggestions: { type: "array", items: { type: "string" } },
            },
            required: ["message", "suggestions"],
          } as never,
          maxOutputTokens: 800,
        },
      });
      // Map our `coach` role to Gemini's `model` (Gemini uses "user" / "model").
      const contents = history.map((m) => ({
        role: m.role === "coach" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const resp = await model.generateContent({ contents });
      const text = resp.response.text();
      if (!text) throw new Error("empty");
      return JSON.parse(text);
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
          properties: {
            title: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            gauntletPrompt: { type: "string" },
            description: { type: "string" },
            salaryMin: { type: "integer" },
            salaryMax: { type: "integer" },
          },
          required: [
            "title",
            "skills",
            "gauntletPrompt",
            "description",
            "salaryMin",
            "salaryMax",
          ],
        },
      );
    } catch {
      return mockAdapter.parseJD(jdText);
    }
  },

  async chatTutor(history, ctx) {
    try {
      const sysText = `You are the unGhost AI Tutor for the bootcamp "${ctx.bootcamp.title}" (skill: ${ctx.bootcamp.skill}). Current lesson: ${
        ctx.video?.title ?? "module overview"
      }. You can explain concepts behind this skill, quiz the student, summarise key ideas, and give analogies. You do NOT have the video transcript or its timestamps — NEVER cite a specific timestamp or claim to quote the video. If asked about a specific moment, ask the student to describe or paste it. You MUST refuse: career advice (redirect to AI Coach), assignment answers, skill-check answers. Reply under 80 words. End with 2-3 short follow-up suggestions.`;
      return await jsonChat(
        sysText,
        history
          .map((m) => `${m.role === "tutor" ? "Tutor" : "Student"}: ${m.content}`)
          .join("\n"),
        {
          type: "object",
          properties: {
            message: { type: "string" },
            suggestions: { type: "array", items: { type: "string" } },
          },
          required: ["message", "suggestions"],
        },
      );
    } catch {
      return mockAdapter.chatTutor(history, ctx);
    }
  },

  async gradeSkillCheck(answers, questions) {
    // Mixed deterministic-MCQ + rubric-graded short-answer. Phase 1: mock.
    // Real impl: iterate per question + per-rubric jsonChat call.
    return mockAdapter.gradeSkillCheck(answers, questions);
  },

  async gradeAssignment(submission, rubric) {
    try {
      const sys =
        "You grade a bootcamp assignment against a rubric. For each criterion, score 0-100 and a one-sentence feedback. Also output overall strengths (max 4), improvements (max 4), plagiarismFlag (true if obvious copy-paste from a known source), aiGeneratedLikelihood (0-100 — pattern-match for boilerplate / over-formal phrasing / lack of personal voice). totalScore is the rounded mean of perCriterion scores.";
      return await jsonChat(
        sys,
        `Submission write-up:\n${submission.writeup}\n\nReflection:\n${submission.reflection}\n\nRubric:\n${rubric
          .map((r) => `- [${r.key}] ${r.label}: ${r.description}`)
          .join("\n")}`,
        {
          type: "object",
          properties: {
            totalScore: { type: "integer" },
            perCriterion: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  score: { type: "integer" },
                  feedback: { type: "string" },
                },
                required: ["key", "score", "feedback"],
              },
            },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            plagiarismFlag: { type: "boolean" },
            aiGeneratedLikelihood: { type: "integer" },
          },
          required: [
            "totalScore",
            "perCriterion",
            "strengths",
            "improvements",
            "plagiarismFlag",
            "aiGeneratedLikelihood",
          ],
        },
      );
    } catch {
      return mockAdapter.gradeAssignment(submission, rubric);
    }
  },
};
