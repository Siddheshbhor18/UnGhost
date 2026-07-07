import type { Metadata } from "next";
import { GlassNavbar } from "@/components/glass";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { ScrollProgress } from "@/components/landing/motion";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { InstructorsStory } from "@/components/landing/InstructorsStory";

export const metadata: Metadata = {
  title: "Our instructors · unGhost",
  description:
    "Meet the operators teaching unGhost bootcamps. No academics reading slides, just people who have shipped the thing they teach. Enrol and start learning.",
};

/**
 * /instructors
 *
 * Public marketing page: a scroll-driven storyline introducing the core
 * bootcamp instructors plus the featured-speaker spotlight. The heavy lifting
 * (reveal choreography, layout) lives in the client <InstructorsStory>; this
 * server shell only assembles the shared chrome (smooth scroll, scroll
 * progress, nav, footer) so it matches the rest of the marketing surface.
 */
export default function InstructorsPage(): React.ReactElement {
  return (
    <>
      <SmoothScroll />
      <ScrollProgress />
      <GlassNavbar />
      <InstructorsStory />
      <SiteFooter />
    </>
  );
}
