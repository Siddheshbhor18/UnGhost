// Groq adapter — primary inference provider.
//
// Chosen for raw latency: llama-3.1-8b-instant typically returns
// sub-200ms first-token via Groq's LPU inference fabric. ~10x faster than
// Gemini 2.5 Flash on the same prompt at a fraction of the per-token cost.
//
// Tradeoff: 8B Llama is less reliable on structured output than Gemini.
// We mitigate two ways:
//   1. JSON-mode is requested (`response_format: { type: "json_object" }`),
//      which forces the model to emit syntactically valid JSON.
//   2. The expected shape is described inline in the system prompt as
//      pseudo-TypeScript. Llama follows it well in practice but we still
//      JSON.parse + guard the result.
//
// On ANY failure (network, non-2xx, JSON parse, empty response) we fall
// through to the Gemini adapter — which itself catches and chains to the
// deterministic mock. So the runtime contract is: this method never
// rejects, even with no API keys set anywhere.
//
// Why no SDK: Groq exposes the standard OpenAI Chat Completions REST
// shape. Native fetch keeps the bundle small + avoids SDK churn.

import { geminiAdapter } from "./gemini";
import type { AIAdapter } from "./index";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

interface GroqChoice {
  message?: { content?: string };
}
interface GroqResponse {
  choices?: GroqChoice[];
}

async function groqJSON<T>(
  system: string,
  user: string,
  shapeHint: string,
  maxTokens = 1200,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GROQ_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content: `${system}\n\nRespond with valid JSON ONLY. Match this exact shape:\n${shapeHint}`,
        },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`groq http ${res.status}`);
  const data = (await res.json()) as GroqResponse;
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty groq response");
  return JSON.parse(text) as T;
}

export const groqAdapter: AIAdapter = {
  async parseResume(rawText) {
    try {
      return await groqJSON(
        "You are a resume parser. Extract precisely. Do not invent facts.",
        `Parse this resume:\n\n${rawText.slice(0, 8000)}`,
        `{ "alias": string, "contactEmail": string, "contactPhone"?: string, "city"?: string, "skills": string[], "history": [{ "title": string, "company": string, "startDate": string, "endDate": string, "impact": string }] }`,
      );
    } catch {
      return geminiAdapter.parseResume(rawText);
    }
  },

  async matchScore(profile, job) {
    try {
      return await groqJSON(
        "You score how well a candidate matches a job. Be calibrated — 90+ should be rare.",
        `Candidate skills: ${profile.skills.join(", ")}\nJob skills: ${job.skills.join(", ")}\nJob title: ${job.title}`,
        `{ "matchPct": integer (0-100), "reasoning": one-sentence string }`,
        400,
      );
    } catch {
      return geminiAdapter.matchScore(profile, job);
    }
  },

  async whyMatch(profile, job) {
    try {
      return await groqJSON(
        "You explain to a student why they match a job. Honest. Never inflate. Verified skills first.",
        `Candidate: skills=${profile.skills.join(", ")}, verified=${profile.verifiedSkills.join(", ")}, trajectory=${profile.trajectory}.\nJob: ${job.title}, skills=${job.skills.join(", ")}.`,
        `{ "summary": 3-sentence string, "strengths": string[2-4], "risks": string[2-3] }`,
        700,
      );
    } catch {
      return geminiAdapter.whyMatch(profile, job);
    }
  },

  async draftMessage(ctx) {
    try {
      const sys = `Draft the first message between a ${ctx.senderRole} and the other side on a hiring platform. Warm but professional. India-context. Under 60 words. No emojis. End with a clear ask.`;
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
      const result = await groqJSON<{ body: string }>(
        sys,
        lines.join("\n"),
        `{ "body": string under 60 words }`,
        400,
      );
      return result.body;
    } catch {
      return geminiAdapter.draftMessage(ctx);
    }
  },

  async gradeAssessment(prompt, response, job) {
    try {
      return await groqJSON(
        "You grade a hiring-assessment answer. Score 0-100 on signal: depth, evidence of real experience, explicit trade-offs. verdict: advance (>=75), borderline (55-74), reject (<55). depthSignal is 0-100.",
        `Job: ${job.title}\nPrompt: ${prompt}\n\nCandidate response:\n${response}`,
        `{ "score": integer (0-100), "notes": string, "verdict": "advance"|"reject"|"borderline", "depthSignal": integer (0-100) }`,
        600,
      );
    } catch {
      return geminiAdapter.gradeAssessment(prompt, response, job);
    }
  },

  async chatCoach(history, profile) {
    try {
      const sys = `You are the unGhost AI Coach. Help students navigate the site (Terminal dashboard, Mission briefs, Assessments, Bootcamps) and give honest career advice. Replies under 80 words. Always end with 2-3 short follow-up suggestions the user might tap.${
        profile ? ` Student skills: ${profile.skills.join(", ")}.` : ""
      }`;
      // Flatten the chat history into a single user turn so we keep one
      // round-trip. JSON-mode applies to the assistant's reply only.
      const transcript = history
        .map((m) => `${m.role === "coach" ? "Coach" : "Student"}: ${m.content}`)
        .join("\n");
      return await groqJSON(
        sys,
        transcript,
        `{ "message": string under 80 words, "suggestions": string[2-3] }`,
        800,
      );
    } catch {
      return geminiAdapter.chatCoach(history, profile);
    }
  },

  async parseJD(jdText) {
    try {
      return await groqJSON(
        "You parse a job description for a hiring platform. Extract canonical fields. Generate one Gauntlet prompt: a 2-3 sentence situational question the candidate must answer in writing. Salaries in INR LPA (Indian lakh per annum, integer 5-200).",
        jdText,
        `{ "title": string, "skills": string[], "gauntletPrompt": 2-3 sentence string, "description": string, "salaryMin": integer (5-200), "salaryMax": integer (5-200) }`,
        900,
      );
    } catch {
      return geminiAdapter.parseJD(jdText);
    }
  },

  async chatTutor(history, ctx) {
    try {
      const sys = `You are the unGhost AI Tutor for bootcamp "${ctx.bootcamp.title}" (skill: ${ctx.bootcamp.skill}). Lesson: ${
        ctx.video?.title ?? "module overview"
      }. You can: explain concepts, reference video timestamps, quiz the student, summarize, give analogies. You MUST refuse: career advice (redirect to AI Coach), assignment answers, skill-check answers. Replies under 80 words. End with 2-3 short follow-up suggestions.`;
      const transcript = history
        .map((m) => `${m.role === "tutor" ? "Tutor" : "Student"}: ${m.content}`)
        .join("\n");
      return await groqJSON(
        sys,
        transcript,
        `{ "message": string under 80 words, "suggestions": string[2-3] }`,
        800,
      );
    } catch {
      return geminiAdapter.chatTutor(history, ctx);
    }
  },

  async gradeSkillCheck(answers, questions) {
    // Mixed deterministic MCQ + rubric grading. Phase 1: delegate to gemini
    // which itself currently mocks this. Future: per-question groqJSON calls.
    return geminiAdapter.gradeSkillCheck(answers, questions);
  },

  async gradeAssignment(submission, rubric) {
    try {
      const sys =
        "You grade a bootcamp assignment against a rubric. Per criterion: score 0-100 + one-sentence feedback. Also: strengths (max 4), improvements (max 4), plagiarismFlag (obvious copy-paste), aiGeneratedLikelihood (0-100, pattern-match boilerplate / over-formal phrasing / lack of personal voice). totalScore = rounded mean of perCriterion scores.";
      return await groqJSON(
        sys,
        `Submission write-up:\n${submission.writeup}\n\nReflection:\n${submission.reflection}\n\nRubric:\n${rubric
          .map((r) => `- [${r.key}] ${r.label}: ${r.description}`)
          .join("\n")}`,
        `{ "totalScore": integer (0-100), "perCriterion": [{ "key": string, "score": integer (0-100), "feedback": string }], "strengths": string[<=4], "improvements": string[<=4], "plagiarismFlag": boolean, "aiGeneratedLikelihood": integer (0-100) }`,
        1500,
      );
    } catch {
      return geminiAdapter.gradeAssignment(submission, rubric);
    }
  },
};
