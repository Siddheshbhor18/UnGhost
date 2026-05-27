"use client";

/**
 * RoleBadge — tiny circular sticker that pops onto the briefcase showing
 * the user's role. Spring pop entrance.
 */

import { motion, useReducedMotion } from "framer-motion";
import {
  GraduationCap,
  CheckCircle2,
  BookOpen,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type RoleId = "student" | "recruiter" | "instructor" | "admin";

const BADGE_BY_ROLE: Record<
  RoleId,
  { icon: LucideIcon; bg: string; ring: string }
> = {
  student: { icon: GraduationCap, bg: "#0191FC", ring: "#003D75" },
  recruiter: { icon: CheckCircle2, bg: "#0E9F6E", ring: "#064E3B" },
  instructor: { icon: BookOpen, bg: "#F59E0B", ring: "#78350F" },
  admin: { icon: ShieldCheck, bg: "#1A1816", ring: "#0A0A0A" },
};

interface Props {
  role: RoleId;
  show: boolean;
  delay?: number;
  size?: number;
}

export function RoleBadge({ role, show, delay = 0, size = 22 }: Props) {
  const reduced = useReducedMotion();
  const { icon: Icon, bg, ring } = BADGE_BY_ROLE[role];
  return (
    <motion.div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        border: `1.5px solid ${ring}`,
        boxShadow: `0 4px 10px ${bg}66`,
        display: "grid",
        placeItems: "center",
        color: "#fff",
      }}
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={
        show
          ? reduced
            ? { scale: 1, rotate: 0, opacity: 1 }
            : { scale: [0, 1.25, 1], rotate: 0, opacity: 1 }
          : { scale: 0, rotate: -180, opacity: 0 }
      }
      transition={
        reduced
          ? { duration: 0.2 }
          : {
              delay,
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      <Icon size={size * 0.55} />
    </motion.div>
  );
}
