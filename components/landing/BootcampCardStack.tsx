"use client";

/**
 * BootcampCardStack — the landing page bootcamp showcase, powered by
 * React Bits' CardSwap (GSAP-driven cycling animation).
 *
 * Left  = narrative copy about bootcamps + stat chips + CTA.
 * Right = CardSwap with 6 premium course cards that cycle automatically.
 *
 * Each card carries a gradient thumbnail matching the course accent, the
 * course icon, title, tagline, and honest course facts (weeks, modules,
 * verified badge). No invented instructors or fabricated bios — the
 * product bans fake social proof, so the cards sell only what the course
 * actually contains.
 */
import {
  Brain,
  Briefcase,
  Handshake,
  Megaphone,
  Rocket,
  Workflow,
  ArrowRight,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ROOMS, type BootcampCategory } from "@/shared/rooms";
import { Button } from "@/components/ui";
import CardSwap, { Card } from "@/components/landing/CardSwap";

/* ─── Course visual theme ─────────────────────────────────────────────── */

interface CourseTheme {
  Icon: LucideIcon;
  from: string;
  to: string;
  glow: string;
  /** Darker shade for readable text on gradient backgrounds. */
  textDark: string;
  /** Very light tint for the icon badge inside the card. */
  iconBg: string;
}

const COURSE_THEME: Record<BootcampCategory, CourseTheme> = {
  ai: {
    Icon: Brain,
    from: "#8B5CF6",
    to: "#6D28D9",
    glow: "139,92,246",
    textDark: "#4C1D95",
    iconBg: "rgba(255,255,255,0.25)",
  },
  gtm: {
    Icon: Workflow,
    from: "#0191FC",
    to: "#0166C8",
    glow: "1,145,252",
    textDark: "#003D75",
    iconBg: "rgba(255,255,255,0.25)",
  },
  marketing: {
    Icon: Megaphone,
    from: "#F43F5E",
    to: "#E11D48",
    glow: "244,63,94",
    textDark: "#881337",
    iconBg: "rgba(255,255,255,0.25)",
  },
  sales: {
    Icon: Handshake,
    from: "#10B981",
    to: "#059669",
    glow: "16,185,129",
    textDark: "#064E3B",
    iconBg: "rgba(255,255,255,0.25)",
  },
  entrepreneurship: {
    Icon: Rocket,
    from: "#F59E0B",
    to: "#D97706",
    glow: "245,158,11",
    textDark: "#78350F",
    iconBg: "rgba(255,255,255,0.25)",
  },
  freelancing: {
    Icon: Briefcase,
    from: "#06B6D4",
    to: "#0891B2",
    glow: "6,182,212",
    textDark: "#164E63",
    iconBg: "rgba(255,255,255,0.25)",
  },
};

/** Short punchy taglines — different from the room blurbs to avoid repetition. */
const COURSE_TAGLINES: Record<BootcampCategory, string> = {
  ai: "Build agents, ship models, think in prompts.",
  gtm: "Engineer revenue. Automate pipelines.",
  marketing: "Growth loops, content engines, paid that works.",
  sales: "Discover, demo, close. B2B muscle.",
  entrepreneurship: "Idea → MVP → traction. Founder playbook.",
  freelancing: "Land clients. Price right. Ship solo.",
};

/** Duration in weeks — gives each card a concrete detail. */
const COURSE_WEEKS: Record<BootcampCategory, number> = {
  ai: 8,
  gtm: 6,
  marketing: 6,
  sales: 4,
  entrepreneurship: 8,
  freelancing: 4,
};

/** Number of modules per course — adds scannability. */
const COURSE_MODULES: Record<BootcampCategory, number> = {
  ai: 12,
  gtm: 10,
  marketing: 10,
  sales: 8,
  entrepreneurship: 14,
  freelancing: 8,
};

/** Small neutral fact chip used in the card metadata row. */
function factChipStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 9px",
    borderRadius: "999px",
    background: "#F5F4F2",
    border: "1px solid #E8E5DF",
    color: "#6B6660",
    fontSize: "11px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };
}

export function BootcampCardStack() {
  return (
    <div className="grid items-center gap-12 grid-cols-1 lg:grid-cols-2 lg:gap-16">
      {/* ── Narrative ─────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-display-lg font-extrabold tracking-tighter text-neutral-950">
          Learn the skill. Then land the role.
        </h2>
        <p className="mt-4 max-w-prose text-body-md leading-relaxed text-neutral-900">
          Six focused bootcamps, built with operators, not academics. Each
          course ends with a Verified Skill badge that recruiters on unGhost
          actually see. No theory dumps. No passive video. Hands-on from day
          one.
        </p>

        {/* Stat chips — quick proof of substance */}
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            { value: "6", label: "Courses" },
            { value: "36", label: "Weeks of content" },
            { value: "1", label: "Verified badge / course" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-xl bg-neutral-0 px-4 py-2.5 ring-1 ring-neutral-200 shadow-elev-1"
            >
              <span className="font-display text-lg font-extrabold tracking-tight text-neutral-950 tnum">
                {stat.value}
              </span>
              <span className="text-body-md text-neutral-900">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link href="#bootcamps">
            <Button
              variant="primary"
              size="md"
              trailingIcon={<ArrowRight size={14} />}
            >
              Explore all courses
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Card swap animation ──────────────────────────────────── */}
      <div className="relative" style={{ minHeight: "420px", height: "500px" }}>
        {/* Soft glow behind the stack */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(55% 50% at 50% 45%, rgba(1,145,252,0.12), transparent 70%)",
          }}
        />

        <CardSwap
          cardDistance={24}
          verticalDistance={36}
          delay={2600}
          pauseOnHover
          width={400}
          height={320}
          skewAmount={4}
          easing="linear"
        >
          {ROOMS.map((room) => {
            const theme = COURSE_THEME[room.id];
            const { Icon } = theme;
            const tagline = COURSE_TAGLINES[room.id];
            const weeks = COURSE_WEEKS[room.id];
            const modules = COURSE_MODULES[room.id];

            return (
              <Card
                key={room.id}
                style={{
                  border: "none",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  padding: 0,
                  boxShadow: `0 15px 35px rgba(0,0,0,0.1), 0 3px 10px rgba(0,0,0,0.05)`,
                }}
              >
                {/* 1. Gradient thumbnail */}
                <div
                  style={{
                    height: "180px",
                    width: "100%",
                    backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Decorative background shapes */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: "-20%",
                      right: "-10%",
                      width: "150px",
                      height: "150px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  />

                  {/* Large course icon in the center of the thumbnail */}
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      display: "grid",
                      placeItems: "center",
                      backdropFilter: "blur(4px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Icon size={28} color="#fff" strokeWidth={2.1} />
                  </div>

                  {/* Duration pill at bottom-right */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "12px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: "#0F0F0F",
                      color: "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {weeks} weeks
                  </div>
                </div>

                {/* 2. Metadata — honest course facts only */}
                <div
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#1A1816",
                      lineHeight: "20px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {room.label} Bootcamp
                  </h4>

                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "12.5px",
                      color: "#6B6660",
                      lineHeight: "17px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {tagline}
                  </p>

                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "10px",
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={factChipStyle()}>{modules} modules</span>
                    <span style={factChipStyle()}>Hands-on projects</span>
                    <span
                      style={{
                        ...factChipStyle(),
                        color: theme.to,
                        background: `rgba(${theme.glow},0.08)`,
                        border: `1px solid rgba(${theme.glow},0.25)`,
                      }}
                    >
                      <BadgeCheck size={11} strokeWidth={2.4} />
                      Verified badge
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </CardSwap>
      </div>
    </div>
  );
}
