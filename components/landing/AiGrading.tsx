import { ShieldCheck } from "lucide-react";
import { AiGradingPlayer } from "./ai-grading/AiGradingPlayer";

/**
 * AiGrading — how applications are judged, shown honestly.
 *
 * The claim sits left; the right column plays a Remotion animation of the
 * grading pass (scenario answer scanned -> rubric dimensions fill -> graded),
 * which falls back to a static, legible rubric panel under reduced motion / no
 * JS. No invented numbers (PRODUCT.md #1/#2): the rubric dimensions are the
 * real ones the grader scores on and the animation is labelled a demo.
 * Asymmetric split is legitimate here because the right column is substantive.
 */
export function AiGrading() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
      {/* Left — the claim */}
      <div className="lg:col-span-5">
        <h2 className="font-display font-extrabold text-display-lg tracking-tight text-neutral-950 [text-wrap:balance]">
          Graded on the work, not the keywords.
        </h2>
        <p className="mt-5 max-w-prose text-body-lg leading-relaxed text-neutral-700">
          Multiple-choice answers are graded the instant you submit. For the
          questions that decide it, an AI reads your actual reasoning against a
          fixed rubric, then shows its work to you and the recruiter.
        </p>
        <p className="mt-6 inline-flex items-center gap-2 text-body-md font-semibold text-brand-600">
          <ShieldCheck size={18} strokeWidth={2} className="shrink-0" />
          You see your score and the notes. No black box.
        </p>
      </div>

      {/* Right — the grading pass in motion (static rubric fallback) */}
      <div className="lg:col-span-7">
        <AiGradingPlayer />
      </div>
    </div>
  );
}
