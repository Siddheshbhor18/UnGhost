// Authoritative skill-check question generation. SERVER-ONLY by design:
// it embeds the answer key (`correctIdx`) and grading rubric, which must
// never reach the browser. The route rebuilds questions here at grade time
// and ignores anything the client submits, so a student cannot tamper with
// the request to forge a passing score (and thus a verified skill).
import type { Bootcamp, BootcampVideo } from "@/shared/types";
import type { SkillCheckQuestion } from "@/shared/types/ai";

/** Build the deterministic 5-question skill check for a video. */
export function buildSkillCheckQuestions(
  video: BootcampVideo,
  bootcamp: Bootcamp,
): SkillCheckQuestion[] {
  const skill = bootcamp.skill;
  return [
    {
      id: `${video.id}-q1`,
      prompt: `Which of these BEST captures the core idea covered in "${video.title}"?`,
      type: "mcq",
      options: [
        `${skill} prioritises precision over coverage.`,
        `${skill} is mostly a marketing concept with little technical depth.`,
        `${skill} only matters in academic settings.`,
        `${skill} replaces the need for testing.`,
      ],
      correctIdx: 0,
    },
    {
      id: `${video.id}-q2`,
      prompt: `In one short answer: name one trade-off you'd accept when applying ${skill} in production.`,
      type: "short",
      rubric: `Identifies a real trade-off such as latency vs accuracy, cost vs depth, or coverage vs precision. References ${skill} explicitly.`,
    },
    {
      id: `${video.id}-q3`,
      prompt: `Which scenario is the WORST fit for ${skill}?`,
      type: "mcq",
      options: [
        `A green-field problem with no prior labels.`,
        `A high-stakes production workflow with strict latency budgets where accuracy doesn't matter.`,
        `A research prototype exploring a new domain.`,
        `An internal tool with patient users.`,
      ],
      correctIdx: 1,
    },
    {
      id: `${video.id}-q4`,
      prompt:
        video.verifyPrompt ??
        `Describe how you'd validate that your ${skill} implementation is working before shipping.`,
      type: "short",
      rubric: `Mentions a validation strategy: holdout test, shadow rollout, manual audit, or measurable success metric. Specific to ${skill}.`,
    },
    {
      id: `${video.id}-q5`,
      prompt: "Which is TRUE about the verification gate after this module?",
      type: "mcq",
      options: [
        "70% pass · 3 attempts · 30-min cooldown.",
        "100% pass · single attempt · no retries.",
        "50% pass · unlimited attempts.",
        "No verification — videos alone earn the badge.",
      ],
      correctIdx: 0,
    },
  ];
}

/**
 * Strip the answer key for client rendering. The browser receives prompts +
 * options but never `correctIdx` or `rubric`, so MCQ answers can't be read
 * from page source.
 */
export function toPublicSkillCheckQuestions(
  questions: SkillCheckQuestion[],
): SkillCheckQuestion[] {
  return questions.map(({ correctIdx: _c, rubric: _r, ...rest }) => rest);
}
