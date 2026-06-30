import {
  Brain,
  Workflow,
  Megaphone,
  Handshake,
  Rocket,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import type { BootcampCategory } from "@/shared/rooms";

/**
 * Per-course brand identity — one source of truth so every surface (catalog,
 * cart, checkout) renders the same icon + accent for a given course. Mirrors
 * the JobMarquee premium treatment: a gradient avatar with a soft coloured
 * halo (`glow` is the RGB triple used for the shadow).
 */
export interface CourseVisual {
  icon: LucideIcon;
  from: string;
  to: string;
  glow: string;
}

export const COURSE_VISUAL: Record<BootcampCategory, CourseVisual> = {
  ai: { icon: Brain, from: "#8B5CF6", to: "#6D28D9", glow: "139,92,246" },
  gtm: { icon: Workflow, from: "#0191FC", to: "#0166C8", glow: "1,145,252" },
  marketing: { icon: Megaphone, from: "#F43F5E", to: "#E11D48", glow: "244,63,94" },
  sales: { icon: Handshake, from: "#10B981", to: "#059669", glow: "16,185,129" },
  entrepreneurship: { icon: Rocket, from: "#F59E0B", to: "#D97706", glow: "245,158,11" },
  freelancing: { icon: Briefcase, from: "#06B6D4", to: "#0891B2", glow: "6,182,212" },
};
