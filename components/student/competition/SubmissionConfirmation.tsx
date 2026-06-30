"use client";

import { CheckCircle2, Share2, Award, Github, Link2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { MotionSection } from "@/components/landing/motion";

interface SubmissionConfirmationProps {
  registrationName: string;
  registrationCollege: string;
  githubRepo: string;
  liveLink: string;
  onEditSubmission: () => void;
  onReset: () => void;
}

/**
 * SubmissionConfirmation — Shown after successful project submission.
 *
 * Displays:
 * - Success header with confetti-colored icon
 * - Submission summary card (GitHub + live link)
 * - Two next-step cards (social share prompts + grading timeline)
 * - Edit/Reset buttons
 */
export function SubmissionConfirmation({
  registrationName,
  registrationCollege,
  githubRepo,
  liveLink,
  onEditSubmission,
  onReset,
}: SubmissionConfirmationProps): JSX.Element {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      {/* Success Header */}
      <MotionSection as="div" delay={0} y={16} amount={0}>
        <Card surface="glass" className="!p-8 space-y-6 border border-emerald-100 bg-emerald-500/5 text-center">
          <div className="flex justify-center">
            <span className="grid place-items-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 shadow-md">
              <CheckCircle2 size={36} />
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-neutral-950 tracking-tight leading-tight">
              Project Submitted!
            </h1>
            <p className="text-neutral-500 text-sm max-w-xl mx-auto">
              Great job, <strong>{registrationName}</strong>! Your hackathon entry for{" "}
              <strong>{registrationCollege}</strong> is logged. The unGhost review board
              will evaluate your submission.
            </p>
          </div>

          {/* Submitted Data */}
          <div className="bg-white/70 border border-neutral-200 rounded-xl p-4 text-left max-w-lg mx-auto space-y-3">
            <p className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
              Submission summary
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-4 py-1 border-b border-neutral-100">
                <span className="font-semibold text-neutral-500 flex items-center gap-1">
                  <Github size={12} /> GitHub Repository:
                </span>
                <a
                  href={githubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 font-medium underline break-all"
                >
                  {githubRepo.replace("https://github.com/", "")}
                </a>
              </div>
              <div className="flex items-center justify-between gap-4 py-1 border-b border-neutral-100">
                <span className="font-semibold text-neutral-500 flex items-center gap-1">
                  <Link2 size={12} /> Live Link:
                </span>
                <a
                  href={liveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 font-medium underline break-all"
                >
                  {liveLink.replace("https://", "")}
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="secondary" size="md" onClick={onEditSubmission}>
              Edit Submission
            </Button>
            <Button variant="ghost" size="md" onClick={onReset}>
              Reset Simulation
            </Button>
          </div>
        </Card>
      </MotionSection>

      {/* Next Steps */}
      <div className="grid sm:grid-cols-2 gap-4">
        <MotionSection as="div" delay={0.1} y={16} amount={0.3}>
          <Card surface="glass" className="h-full space-y-2">
            <h3 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-1.5">
              <Share2 size={14} className="text-brand-500" /> Share on Socials
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Earn your <strong>+150 point multipliers</strong>! Post your 2-minute
              video on LinkedIn tagging <strong>#unGhostHackathon</strong> and tag our
              handle on Instagram with your product screens.
            </p>
          </Card>
        </MotionSection>

        <MotionSection as="div" delay={0.2} y={16} amount={0.3}>
          <Card surface="glass" className="h-full space-y-2">
            <h3 className="font-display font-bold text-sm text-neutral-900 flex items-center gap-1.5">
              <Award size={14} className="text-brand-500" /> Grading Timeline
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Evaluation runs 3 days post-competition. The top winners will be
              emailed directly with details on claiming the ₹50,000 cash prize.
            </p>
          </Card>
        </MotionSection>
      </div>
    </div>
  );
}
