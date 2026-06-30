"use client";

/**
 * BootcampCardStack — the landing page bootcamp showcase, powered by
 * React Bits' CardSwap (GSAP-driven cycling animation).
 *
 * Left  = narrative copy about bootcamps + stat chips + CTA.
 * Right = CardSwap with 6 premium course cards that cycle automatically.
 *
 * Each card features a gradient background matching the course accent,
 * the course icon, title, tagline, and week count. The CardSwap component
 * handles the 3D stacking + cycling animation via GSAP.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Briefcase,
  Handshake,
  Megaphone,
  Rocket,
  Workflow,
  ArrowRight,
  Play,
  User,
  X,
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

export function BootcampCardStack() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      {/* ── Narrative ─────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-display-lg font-extrabold tracking-tighter text-neutral-950">
          Learn the skill. Then land the role.
        </h2>
        <p className="mt-4 max-w-prose text-body-md leading-relaxed text-neutral-500">
          Six focused bootcamps — built with operators, not academics. Each
          course ends with a Verified Skill badge that recruiters on unGhost
          actually see. No theory dumps. No passive video. Hands-on from day
          one.
        </p>

        {/* Stat chips — quick proof of substance */}
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            { value: "6", label: "Courses" },
            { value: "36", label: "Weeks total" },
            { value: "36", label: "Modules total" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 rounded-xl bg-neutral-0 px-4 py-2.5 ring-1 ring-neutral-200 shadow-elev-1"
            >
              <span className="font-display text-lg font-extrabold tracking-tight text-neutral-950 tnum">
                {stat.value}
              </span>
              <span className="text-body-sm text-neutral-500">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="#bootcamps">
            <Button
              variant="primary"
              size="md"
              trailingIcon={<ArrowRight size={14} />}
            >
              Explore all courses
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsModalOpen(true)}
          >
            Our instructors
          </Button>
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

            // Instructor details for the placeholder
            const instructorTitle = 
              room.id === "ai" ? "Senior AI Researcher" :
              room.id === "gtm" ? "VP of Revenue Ops" :
              room.id === "marketing" ? "Growth Director" :
              room.id === "sales" ? "Enterprise Sales Head" :
              room.id === "entrepreneurship" ? "YC Alum Founder" :
              "Top Solo Consultant";

            const instructorName =
              room.id === "ai" ? "Dr. Amit Sharma" :
              room.id === "gtm" ? "Karan Malhotra" :
              room.id === "marketing" ? "Rohan Sen" :
              room.id === "sales" ? "Neha Gupta" :
              room.id === "entrepreneurship" ? "Aditya Roy" :
              "Vikram Singh";

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
                {/* 1. YouTube-style Thumbnail part */}
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
                  
                  {/* Large Course Icon in center of thumbnail */}
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

                  {/* Play button overlay (YouTube hallmark) */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      left: "12px",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      display: "grid",
                      placeItems: "center",
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <Play size={12} color="#fff" fill="#fff" style={{ marginLeft: "1.5px" }} />
                  </div>

                  {/* Duration Pill at bottom-right of image (YouTube Hallmark) */}
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
                    {weeks}:00
                  </div>
                </div>

                {/* 2. YouTube-style Metadata section */}
                <div
                  style={{
                    padding: "16px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    flex: 1,
                  }}
                >
                  {/* Left: Instructor Avatar Placeholder */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#F2F0EC",
                      border: "1px solid #E8E5DF",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {/* Real Image Placeholder:
                        <img src={`/instructors/${room.id}.jpg`} alt={instructorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    */}
                    <User size={18} className="text-neutral-500" />
                  </div>

                  {/* Right: Title, Channel/Instructor info, View count (tagline) */}
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "14px",
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
                    
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6B6660",
                        marginTop: "2px",
                        fontWeight: 500,
                      }}
                    >
                      {instructorName} • {instructorTitle}
                    </span>

                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "12px",
                        color: "#6B6660",
                        lineHeight: "16px",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tagline}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </CardSwap>
      </div>

      {/* ── Instructors Modal Overlays ────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl bg-neutral-0 border border-neutral-200 p-6 md:p-8 shadow-elev-4 z-10"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-neutral-100 pb-5">
                <div>
                  <h3 className="font-display text-2xl font-extrabold tracking-tight text-neutral-950">
                    Our Instructors
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Learn from top operators who have built what they teach.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-neutral-200 bg-neutral-0 p-2 text-neutral-500 hover:text-neutral-900 shadow-elev-1 hover:bg-neutral-50 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Grid list of instructors */}
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                {ROOMS.map((room) => {
                  const theme = COURSE_THEME[room.id];
                  
                  const instructorName =
                    room.id === "ai" ? "Dr. Amit Sharma" :
                    room.id === "gtm" ? "Karan Malhotra" :
                    room.id === "marketing" ? "Rohan Sen" :
                    room.id === "sales" ? "Neha Gupta" :
                    room.id === "entrepreneurship" ? "Aditya Roy" :
                    "Vikram Singh";

                  const instructorTitle = 
                    room.id === "ai" ? "Senior AI Researcher" :
                    room.id === "gtm" ? "VP of Revenue Ops" :
                    room.id === "marketing" ? "Growth Director" :
                    room.id === "sales" ? "Enterprise Sales Head" :
                    room.id === "entrepreneurship" ? "YC Alum Founder" :
                    "Top Solo Consultant";

                  const instructorBio =
                    room.id === "ai" ? "Leading researcher in generative AI and agents. Formerly at Microsoft Research, building large language models." :
                    room.id === "gtm" ? "Automating pipelines and revenue scale at leading SaaS firms. Expert in HubSpot, Salesforce, and custom CRM systems." :
                    room.id === "marketing" ? "Scales user acquisition from zero to millions. Performance marketing, SEO, and viral growth loop practitioner." :
                    room.id === "sales" ? "Closed $50M+ in ARR across enterprise software. Specializes in B2B discovery, negotiation, and high-value closing." :
                    room.id === "entrepreneurship" ? "Built and exited 2 venture-backed startups. Active advisor to early-stage founders on MVPs and operations." :
                    "Built a $250k/year consulting business. Expert in client acquisition, value-based pricing, and running lean solo operations.";

                  return (
                    <div
                      key={room.id}
                      className="flex gap-4 p-5 rounded-2xl border border-neutral-200 bg-neutral-0 shadow-elev-1 hover:shadow-elev-2 transition-all duration-300"
                    >
                      {/* Left: Avatar placeholder */}
                      <div
                        style={{
                          width: "56px",
                          height: "56px",
                          borderRadius: "50%",
                          background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                          padding: "2px",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          className="w-full h-full rounded-full bg-neutral-0 border border-neutral-200/50 flex items-center justify-center overflow-hidden"
                        >
                          {/* Real image placeholder:
                              <img src={`/instructors/${room.id}.jpg`} alt={instructorName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          */}
                          <User size={24} className="text-neutral-400" />
                        </div>
                      </div>

                      {/* Right: Info */}
                      <div>
                        <h4 className="font-display font-bold text-[15px] text-neutral-950 leading-tight">
                          {instructorName}
                        </h4>
                        <span className="inline-block mt-0.5 text-xs font-semibold text-brand-600">
                          {instructorTitle} • {room.label}
                        </span>
                        <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                          {instructorBio}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
