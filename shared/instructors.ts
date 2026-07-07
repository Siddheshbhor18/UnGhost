/**
 * Instructor roster for the /instructors storyline page.
 *
 * Content is real, supplied by the team (names, roles, bios, portraits in
 * /public). A missing portrait may be `null` — the UI then renders a monogram
 * placeholder instead of inventing a face (the product bans fake social
 * proof). Per PRODUCT.md we keep claims qualitative and only state figures
 * the team provided — never invented statistics.
 *
 * Three main instructors cover the six bootcamp rooms between them (see
 * `shared/rooms.ts`). Abhinav Ranka is featured separately via the
 * <FeaturedSpeaker /> spotlight, not in this roster.
 */
import type { BootcampCategory } from "@/shared/rooms";

export interface Instructor {
  /** Stable slug — safe for keys, anchors, and future deep links. */
  readonly id: string;
  readonly name: string;
  /** Current title / where they operate. */
  readonly role: string;
  /** One-line hook shown under the name. */
  readonly tagline: string;
  /** Body copy, one entry per paragraph. */
  readonly bio: readonly string[];
  /** Short credibility bullets (qualitative, no invented stats). */
  readonly highlights: readonly string[];
  /** Bootcamp rooms this person teaches. */
  readonly teaches: readonly BootcampCategory[];
  /** Portrait path under /public, or null to render the monogram placeholder. */
  readonly image: string | null;
}

export const INSTRUCTORS: readonly Instructor[] = [
  {
    id: "atharva-pache",
    name: "Atharva Pache",
    role: "Founder, unGhost & BigVision",
    tagline:
      "Freelancer in 11th grade, founder at 19, now scaling BigVision past $40K MRR.",
    bio: [
      "Atharva is the Founder of unGhost and Founder of BigVision. He began his journey as a freelancer while still in 11th grade, gaining hands-on experience long before starting his first company at the age of 19.",
      "Today he leads multiple ventures, with BigVision growing to $40K+ in monthly recurring revenue. In his bootcamps he shares the real strategies behind marketing, sales, freelancing, and building businesses from scratch.",
    ],
    highlights: [
      "Founder of unGhost and BigVision",
      "Started freelancing in 11th grade, first company at 19",
      "Scaled BigVision past $40K in monthly recurring revenue",
    ],
    teaches: ["marketing", "sales", "freelancing", "entrepreneurship"],
    image: "/atharvainst.png",
  },
  {
    id: "anshika-reja",
    name: "Anshika Reja",
    role: "Co-Founder, unGhost · Co-MD, BigVision Marketing",
    tagline:
      "Builds brands through content, and a 700+ strong student community.",
    bio: [
      "Anshika Reja is the Co-Founder of unGhost and Co-MD of BigVision Marketing. She has helped founders and businesses build their brands through content and marketing, while growing a community of 700+ ambitious students.",
      "In her bootcamps she shares the practical roadmap to starting freelancing, finding your first clients, building a personal brand, and turning skills into income.",
    ],
    highlights: [
      "Co-Founder of unGhost, Co-MD of BigVision Marketing",
      "Grew a community of 700+ ambitious students",
      "Helps founders build brands through content and marketing",
    ],
    teaches: ["marketing", "freelancing"],
    image: "/anshikareal.png",
  },
  {
    id: "ritu-maurya",
    name: "Ritu Maurya",
    role: "GTM Engineer, FullFunnel",
    tagline:
      "Turns cold outbound into a predictable growth engine with AI and Clay.",
    bio: [
      "Ritu is a GTM Engineer at FullFunnel, where she architects AI-powered outbound systems for international B2B clients. Before that she led growth at Finnet Media, running influencer partnerships with brands like TATA Capital, IDFC Bank, and Bajaj Finserv while steering a 14-member talent team.",
      "She turns outbound into a predictable, scalable motion: mapping the right market, enriching lead data with Clay, and personalising messaging at scale so it actually gets replies. In her bootcamp she shares how to build these AI-driven sales systems from scratch.",
    ],
    highlights: [
      "GTM Engineer at FullFunnel, building for global B2B clients",
      "Builds AI-powered outbound with Clay, Smartlead, and Make.com",
      "Ran 100+ high-ticket B2B sales calls at 40%+ conversion",
    ],
    teaches: ["gtm"],
    image: "/ritu.png",
  },
] as const;
