"use client";

import { useState, useCallback, useRef } from "react";
import {
  Github,
  Link2,
  Check,
  PartyPopper,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button, Card, Input, Textarea } from "@/components/ui";

const CONFETTI_COUNT = 50;

interface SubmissionData {
  githubRepo: string;
  liveLink: string;
  techStack: string;
  breakdown: string;
}

interface SubmissionHubProps {
  registrationName: string;
  registrationCollege: string;
  /** Existing submission data if already submitted previously */
  existingSubmission?: SubmissionData;
  onSubmit: (data: SubmissionData) => void;
  onReset: () => void;
}

/**
 * SubmissionHub — Project submission form shown after registration.
 *
 * Contains:
 * - GitHub repo + live link inputs
 * - Tech stack + project breakdown
 * - Submission checklist
 * - Confetti on successful submission
 *
 * All state in-memory — parent persists to localStorage.
 */
export function SubmissionHub({
  registrationName,
  registrationCollege,
  existingSubmission,
  onSubmit,
  onReset,
}: SubmissionHubProps): JSX.Element {
  const [showConfetti, setShowConfetti] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showChecklist, setShowChecklist] = useState(true);

  const [data, setData] = useState<SubmissionData>({
    githubRepo: existingSubmission?.githubRepo ?? "",
    liveLink: existingSubmission?.liveLink ?? "",
    techStack: existingSubmission?.techStack ?? "",
    breakdown: existingSubmission?.breakdown ?? "",
  });

  const update = useCallback(
    (field: keyof SubmissionData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!data.githubRepo.trim()) errs.githubRepo = "GitHub repo URL is required";
    else if (!data.githubRepo.includes("github.com"))
      errs.githubRepo = "Must be a valid GitHub URL";
    if (!data.liveLink.trim()) errs.liveLink = "Live deployment link is required";
    else if (!data.liveLink.startsWith("http"))
      errs.liveLink = "Must start with https://";
    if (!data.techStack.trim()) errs.techStack = "Tech stack is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setShowConfetti(true);
    setTimeout(() => {
      onSubmit(data);
    }, 1800);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 1.2;
            const duration = 2.5 + Math.random() * 1.5;
            const hue = Math.floor(Math.random() * 360);
            const size = 6 + Math.random() * 6;
            const rotation = Math.random() * 720;
            return (
              <div
                key={i}
                className="absolute top-[-5%]"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size * 0.6}px`,
                  backgroundColor: `hsl(${hue}, 80%, 58%)`,
                  borderRadius: "1px",
                  animation: `comp-confetti-fall ${duration}s cubic-bezier(0.23, 1, 0.32, 1) ${delay}s forwards`,
                  transform: `rotate(${rotation}deg)`,
                }}
              />
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3 animate-[comp-confetti-pop_0.5s_ease-out_0.2s_both]">
              <PartyPopper size={48} className="mx-auto text-brand-500" />
              <p className="font-display font-extrabold text-2xl text-neutral-950">
                Submitted!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="font-display font-extrabold text-2xl md:text-3xl text-neutral-950 tracking-tight">
          Submit Your Project
        </h2>
        <p className="text-body-sm text-neutral-500 mt-1">
          Welcome back, <strong>{registrationName}</strong> from <strong>{registrationCollege}</strong>. 
          Push your code and share the live link below.
        </p>
      </div>

      {/* Submission Form */}
      <Card surface="glass" className="!p-6 md:!p-8 space-y-5">
        <div className="grid gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 mb-1.5">
              <Github size={13} className="text-neutral-500" />
              GitHub Repository URL
            </label>
            <Input
              value={data.githubRepo}
              onChange={(e) => update("githubRepo", e.target.value)}
              placeholder="https://github.com/you/project"
              className={errors.githubRepo ? "!border-error !ring-error/30" : ""}
            />
            {errors.githubRepo && (
              <p className="text-xs text-error mt-1">{errors.githubRepo}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 mb-1.5">
              <Link2 size={13} className="text-neutral-500" />
              Live Deployment URL
            </label>
            <Input
              value={data.liveLink}
              onChange={(e) => update("liveLink", e.target.value)}
              placeholder="https://yourproject.vercel.app"
              className={errors.liveLink ? "!border-error !ring-error/30" : ""}
            />
            {errors.liveLink && (
              <p className="text-xs text-error mt-1">{errors.liveLink}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 mb-1.5">
              <Sparkles size={13} className="text-neutral-500" />
              Tech Stack
            </label>
            <Input
              value={data.techStack}
              onChange={(e) => update("techStack", e.target.value)}
              placeholder="Next.js, Tailwind, MongoDB, Vercel AI SDK..."
              className={errors.techStack ? "!border-error !ring-error/30" : ""}
            />
            {errors.techStack && (
              <p className="text-xs text-error mt-1">{errors.techStack}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Project Breakdown (optional)
            </label>
            <Textarea
              value={data.breakdown}
              onChange={(e) => update("breakdown", e.target.value)}
              placeholder="Describe what you built, key features, your approach, and any AI tools you used..."
              rows={4}
            />
          </div>
        </div>
      </Card>

      {/* Submission Checklist */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-100/50 transition"
          onClick={() => setShowChecklist(!showChecklist)}
        >
          <h4 className="font-bold text-xs text-neutral-700 uppercase tracking-wider">
            Submission Checklist
          </h4>
          {showChecklist ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
        </button>
        {showChecklist && (
          <ul className="px-4 pb-4 space-y-2 text-xs text-neutral-600">
            <li className="flex items-center gap-2">
              <Check className="text-emerald-600" size={14} />
              <span>Code repositories are fully public.</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-emerald-600" size={14} />
              <span>Live link opens on desktop and mobile.</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-emerald-600" size={14} />
              <span>Individual work confirmation verified.</span>
            </li>
          </ul>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset Simulation
        </Button>
        <Button
          variant="primary"
          size="lg"
          trailingIcon={<Check size={16} />}
          onClick={handleSubmit}
        >
          Submit Project
        </Button>
      </div>
    </div>
  );
}
