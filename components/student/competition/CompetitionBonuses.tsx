"use client";

import { Linkedin, Video } from "lucide-react";
import { Card } from "@/components/ui";
import { MotionSection } from "@/components/landing/motion";

const BONUSES = [
  {
    icon: <Linkedin size={20} />,
    platform: "LinkedIn",
    points: "+150",
    title: "Post a 2-Minute Demo",
    description:
      "Record a short walkthrough of your product and post it on LinkedIn. Tag #unGhostHackathon and mention our handle. Judges will verify the post link.",
    bgClass: "bg-blue-50/60 border-blue-100",
    iconBg: "bg-blue-500",
  },
  {
    icon: <Video size={20} />,
    platform: "Instagram",
    points: "+150",
    title: "Share a Product Reel",
    description:
      "Showcase your working UI dashboard or app screens via a high-quality product reel on Instagram. Tag #unGhostHackathon for bonus points.",
    bgClass: "bg-pink-50/60 border-pink-100",
    iconBg: "bg-gradient-to-br from-pink-500 to-purple-500",
  },
] as const;

/**
 * CompetitionBonuses — Two bonus multiplier cards for social media posts.
 *
 * Asymmetric 2-column layout with tinted backgrounds (blue for LinkedIn,
 * pink-purple for Instagram). Each card staggers in on scroll.
 */
export function CompetitionBonuses(): JSX.Element {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 md:py-20">
      <MotionSection as="div" className="max-w-2xl" amount={0.3}>
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-neutral-950 tracking-tight leading-tight">
          Boost your score.
        </h2>
        <p className="text-body-md text-neutral-500 mt-3 leading-relaxed max-w-prose">
          Earn bonus points by documenting your build and sharing it on social media.
          These multipliers stack on top of your submission score.
        </p>
      </MotionSection>

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        {BONUSES.map((bonus, i) => (
          <MotionSection
            key={bonus.platform}
            as="div"
            delay={0.1 + i * 0.12}
            y={20}
            amount={0.3}
          >
            <Card
              surface="solid"
              className={`!p-6 h-full border ${bonus.bgClass} space-y-4`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid place-items-center w-10 h-10 rounded-xl text-white shadow-md ${bonus.iconBg}`}
                >
                  {bonus.icon}
                </span>
                <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                  {bonus.points} Points
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-base text-neutral-900 tracking-tight">
                  {bonus.title}
                </h3>
                <p className="text-body-sm text-neutral-500 leading-relaxed">
                  {bonus.description}
                </p>
              </div>
            </Card>
          </MotionSection>
        ))}
      </div>
    </section>
  );
}
