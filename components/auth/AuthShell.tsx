"use client";

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { BackdropMesh } from "@/components/ui";
import { Logo } from "@/components/glass";
import { AuthHero, type AuthHeroPhase } from "./AuthHero";
import { CursorGlow } from "./CursorGlow";
import type { Role } from "./RolePicker";

/**
 * AuthShell — page-level container for /login and /signup.
 *
 * Layout philosophy:
 *   • Locked to viewport height (`h-screen flex flex-col`) so the form
 *     never causes a page scroll on standard laptops. Only the card's
 *     internal content scrolls if absolutely necessary (very small
 *     viewports, signup step 2 with all consents expanded).
 *   • Header (logo) and footer (DPDP badge) are compact, ~48-52 px each.
 *   • Body flexes to fill the middle and centers the form card vertically.
 *   • Background stack (back-to-front): BackdropMesh → role-tinted overlay
 *     → CursorGlow that follows the mouse.
 */
const ROLE_TINTS: Record<Role, [string, string]> = {
  student: ["#0191FC", "#3454DA"],
  recruiter: ["#7C3AED", "#3454DA"],
  instructor: ["#F59E0B", "#EA580C"],
  admin: ["#1A1816", "#3F3B36"],
};

interface Props {
  role: Role;
  mode: "signin" | "signup";
  /** Drives the hero choreography. Defaults to "idle". */
  heroPhase?: AuthHeroPhase;
  children: React.ReactNode;
}

export function AuthShell({ role, mode, heroPhase = "idle", children }: Props) {
  const reduced = useReducedMotion();
  const [from, to] = ROLE_TINTS[role];

  return (
    <main className="relative h-screen overflow-hidden flex flex-col">
      <BackdropMesh />
      <CursorGlow />

      {/* Role-tinted gradient overlay — cross-fades on role change. */}
      <AnimatePresence mode="sync">
        <motion.div
          key={role}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background: `radial-gradient(70% 50% at 80% 50%, ${from}24, transparent 60%), radial-gradient(50% 40% at 75% 80%, ${to}1E, transparent 70%)`,
          }}
          initial={reduced ? { opacity: 0.7 } : { opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </AnimatePresence>

      <header className="relative z-10 px-6 lg:px-10 pt-4 lg:pt-5 shrink-0">
        <Link href="/" aria-label="unGhost home" className="inline-block">
          <Logo size="md" />
        </Link>
      </header>

      <div className="relative z-10 flex-1 min-h-0 grid lg:grid-cols-[minmax(0,460px)_1fr] gap-8 lg:gap-10 px-6 lg:px-10 py-4 lg:py-6 max-w-6xl w-full mx-auto items-center">
        <div className="w-full max-w-md mx-auto lg:mx-0 h-full lg:h-auto flex items-center">
          <div className="w-full max-h-full overflow-y-auto rounded-3xl">
            {children}
          </div>
        </div>
        <AuthHero role={role} mode={mode} phase={heroPhase} />
      </div>

      <footer className="relative z-10 px-6 lg:px-10 pb-3 lg:pb-4 text-[10px] text-brand-muted shrink-0">
        Data residency · Mumbai · DPDP compliant
      </footer>
    </main>
  );
}
