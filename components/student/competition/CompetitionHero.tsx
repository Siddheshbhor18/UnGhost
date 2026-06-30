"use client";

import { Trophy, Award, ArrowRight } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { MotionSection, RevealText } from "@/components/landing/motion";
import { GhostAnimation } from "./GhostAnimation";

interface CompetitionHeroProps {
  onRegister: () => void;
}

/**
 * CompetitionHero — Split 7/5 hero section for the hackathon page.
 *
 * Left column: animated headline via RevealText, subtext, prize card.
 * Right column: floating ghost character.
 * Matches the unGhost landing page visual language (grid-cols-12, 7/5 split).
 */
export function CompetitionHero({ onRegister }: CompetitionHeroProps): JSX.Element {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-10 md:pt-16 pb-6 relative">
      {/* Grid overlay — editorial backdrop matching landing page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(1,145,252,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(1,145,252,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 30%, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 30%, black 30%, transparent 70%)",
        }}
      />

      <div className="grid lg:grid-cols-12 gap-10 items-center">
        {/* Left — Copy */}
        <div className="lg:col-span-7 space-y-5">
          <MotionSection as="div" delay={0} y={0} amount={0}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 border border-brand-100">
              <Trophy size={12} className="text-brand-500" />
              NATIONAL HACKATHON
            </span>
          </MotionSection>

          <h1 className="font-display font-extrabold tracking-tightest text-4xl md:text-6xl text-neutral-950 leading-[1.04]">
            <RevealText
              segments={[
                "Build the Future.",
                <br key="br" />,
                <span className="accent" key="accent">
                  Powered by AI.
                </span>,
              ]}
              stagger={0.07}
              delay={0.15}
              trigger="mount"
            />
          </h1>

          <MotionSection
            as="p"
            className="text-body-lg text-neutral-500 max-w-xl leading-relaxed"
            delay={0.5}
            y={16}
            amount={0}
          >
            A 1-week solo competition for developers to build state-of-the-art products.
            Just you, your ideas, and your AI stack. ₹50,000 cash prize pool.
          </MotionSection>

          {/* Prize Pool Card */}
          <MotionSection as="div" delay={0.65} y={12} amount={0}>
            <div className="relative group inline-block">
              <div className="absolute inset-0 bg-brand-500/10 rounded-2xl blur-xl transition group-hover:bg-brand-500/20" />
              <Card
                surface="glass"
                className="relative !p-5 flex items-center gap-4 border border-brand-100 shadow-md"
                style={{ animation: "comp-prize-float 6s ease-in-out infinite" }}
              >
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-500 text-white shadow-brand-glow">
                  <Award size={28} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-brand-600 font-semibold">
                    Total Prize Pool
                  </p>
                  <p className="font-display font-extrabold text-2xl text-neutral-950 tracking-tight tnum">
                    ₹50,000
                  </p>
                </div>
              </Card>
            </div>
          </MotionSection>

          {/* CTA */}
          <MotionSection as="div" delay={0.8} y={16} amount={0}>
            <Button
              variant="primary"
              size="lg"
              trailingIcon={<ArrowRight size={16} />}
              onClick={onRegister}
            >
              Register Now
            </Button>
          </MotionSection>
        </div>

        {/* Right — Ghost */}
        <MotionSection
          as="div"
          className="lg:col-span-5 flex justify-center"
          delay={0.35}
          y={0}
          amount={0}
        >
          <div className="w-[260px] h-[300px] flex items-center justify-center">
            <GhostAnimation />
          </div>
        </MotionSection>
      </div>
    </section>
  );
}
