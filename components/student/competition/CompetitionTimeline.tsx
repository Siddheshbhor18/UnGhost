"use client";

import { ClipboardCheck, Code2, Send } from "lucide-react";
import { MotionSection } from "@/components/landing/motion";

const STEPS = [
  {
    icon: <ClipboardCheck size={20} />,
    title: "Register",
    description: "Fill your details, confirm your college and socials. Takes 2 minutes.",
  },
  {
    icon: <Code2 size={20} />,
    title: "Build for 7 Days",
    description: "Build any product you want. Solo. Use AI tools, frameworks, whatever. Ship it live.",
  },
  {
    icon: <Send size={20} />,
    title: "Submit & Win",
    description: "Push your code, share the live link, break down your stack. Top builder walks away with ₹50k.",
  },
] as const;

/**
 * CompetitionTimeline — Vertical timeline showing the 3-step hackathon flow.
 *
 * Uses a connecting vertical line (brand gradient) with numbered step nodes.
 * Each step staggers in on scroll via MotionSection.
 */
export function CompetitionTimeline(): JSX.Element {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 md:py-20">
      <MotionSection as="div" className="max-w-2xl" amount={0.3}>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-neutral-950 tracking-tight leading-tight">
          Three steps. One winner.
        </h2>
        <p className="text-body-md text-neutral-500 mt-3 leading-relaxed max-w-prose">
          No teams. No gatekeeping. Register, build something real in 7 days, submit and compete.
        </p>
      </MotionSection>

      {/* Timeline */}
      <div className="relative mt-12 ml-6 md:ml-8 border-l-2 border-brand-100 pl-8 md:pl-10 space-y-12">
        {/* Animated gradient overlay on the line */}
        <div
          className="timeline-line absolute left-[-1px] top-0 w-[2px] h-full bg-gradient-to-b from-brand-500 via-brand-300 to-transparent"
          aria-hidden
        />

        {STEPS.map((step, i) => (
          <MotionSection
            key={step.title}
            as="div"
            className="relative"
            delay={0.1 + i * 0.12}
            y={20}
            amount={0.4}
          >
            {/* Step node circle */}
            <div className="absolute -left-[calc(2rem+13px)] md:-left-[calc(2.5rem+13px)] top-0.5 grid place-items-center w-7 h-7 rounded-full bg-brand-500 text-white text-xs font-bold shadow-md ring-4 ring-white">
              {i + 1}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-brand-500">{step.icon}</span>
                <h3 className="font-display font-bold text-lg text-neutral-900 tracking-tight">
                  {step.title}
                </h3>
              </div>
              <p className="text-body-sm text-neutral-500 leading-relaxed max-w-md">
                {step.description}
              </p>
            </div>
          </MotionSection>
        ))}
      </div>
    </section>
  );
}
