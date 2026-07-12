"use client";

import { motion, LayoutGroup, useReducedMotion } from "framer-motion";
import { BookOpen, Briefcase, GraduationCap, ShieldCheck, User2 } from "lucide-react";
import clsx from "clsx";

/**
 * RolePicker — animated role selector shared by /login and the signup wizard.
 *
 * Variant "pills" → the two public roles (student + recruiter) as a tight pill
 *                   row. Instructor + admin are provisioned accounts that sign
 *                   in via their dedicated /instructor and /admin entry points,
 *                   so they never appear as a self-select tab.
 * Variant "cards" → student + recruiter as larger tappable cards (signup).
 *
 * The active indicator slides between options using framer's layoutId so the
 * motion reads as a single continuous element instead of cross-fading two
 * separate elements.
 */
export type Role = "student" | "recruiter" | "instructor" | "admin";

export interface RoleOption {
  id: Role;
  label: string;
  icon: React.ReactNode;
  demoEmail?: string;
  /** The literal account type ("Student" / "Recruiter"), shown as the card
   *  eyebrow so the user is never guessing which account they're creating. */
  roleWord?: string;
  /** One-line clarifier shown under the card title (cards variant only). */
  desc?: string;
}

// Demo "Try as…" credentials are dev-only. In a production build NODE_ENV is
// statically "production", so this is `false` and the minifier eliminates the
// branch — the demo emails never reach the shipped bundle. This stops the
// public login from advertising the admin account email (and demo passwords).
const DEMO_LOGINS = process.env.NODE_ENV !== "production";

/**
 * Full role metadata (all four). Consumers (e.g. /login's dev "Try as…" button
 * and the role-locked instructor/admin cards) look roles up here by id even
 * though only `LOGIN_PILLS` is rendered as a public selector.
 */
const ROLE_META: Record<Role, RoleOption> = {
  student: { id: "student", label: "Student", icon: <User2 size={14} />, demoEmail: DEMO_LOGINS ? "alice@demo.test" : undefined },
  recruiter: { id: "recruiter", label: "Recruiter", icon: <ShieldCheck size={14} />, demoEmail: DEMO_LOGINS ? "hr@stark.test" : undefined },
  instructor: { id: "instructor", label: "Instructor", icon: <BookOpen size={14} />, demoEmail: DEMO_LOGINS ? "cristian@instructor.test" : undefined },
  admin: { id: "admin", label: "Admin", icon: <GraduationCap size={14} />, demoEmail: DEMO_LOGINS ? "root@noghost.test" : undefined },
};

// The login card only lets a visitor self-select the two public roles.
const LOGIN_PILLS: RoleOption[] = [ROLE_META.student, ROLE_META.recruiter];

const SIGNUP_TWO: RoleOption[] = [
  {
    id: "student",
    label: "Find a job",
    roleWord: "Student",
    desc: "Apply to jobs and get a real reply.",
    icon: <User2 size={16} />,
  },
  {
    id: "recruiter",
    label: "Hire talent",
    roleWord: "Recruiter",
    desc: "Post jobs and hire talent.",
    icon: <Briefcase size={16} />,
  },
];

interface Props {
  value: Role;
  onChange: (next: Role) => void;
  variant?: "pills" | "cards";
  /** Override the role list. Defaults to all four for pills, signup-two for cards. */
  roles?: RoleOption[];
}

export function RolePicker({ value, onChange, variant = "pills", roles }: Props) {
  const reduced = useReducedMotion();
  const items = roles ?? (variant === "pills" ? LOGIN_PILLS : SIGNUP_TWO);

  if (variant === "cards") {
    return (
      <LayoutGroup>
        <div className="grid grid-cols-2 gap-2">
          {items.map((r) => {
            const active = value === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onChange(r.id)}
                className={clsx(
                  "relative rounded-2xl border px-4 py-3.5 text-left transition",
                  active
                    ? "border-brand-primary bg-brand-primary/8"
                    : "border-brand-ink/10 hover:border-brand-primary/40 bg-white/40",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="role-card-active"
                    className="absolute inset-0 rounded-2xl ring-2 ring-brand-primary/30 pointer-events-none"
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 30 }
                    }
                  />
                ) : null}
                <span
                  className={clsx(
                    "inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider",
                    active ? "text-brand-primary" : "text-brand-muted",
                  )}
                >
                  {r.icon}
                  {r.roleWord ?? "Role"}
                </span>
                <p className="font-display font-bold text-brand-ink mt-1 text-sm">
                  {r.label}
                </p>
                {r.desc ? (
                  <p className="text-[11px] text-brand-muted mt-0.5 leading-snug">
                    {r.desc}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    );
  }

  // pills
  return (
    <LayoutGroup>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-brand-ink/[0.04] border border-brand-ink/5">
        {items.map((r) => {
          const active = value === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(r.id)}
              className={clsx(
                "relative rounded-lg py-2 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5",
                active ? "text-brand-ink" : "text-brand-muted hover:text-brand-ink",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="role-pill-active"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm border border-brand-ink/5"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 32 }
                  }
                />
              ) : null}
              <span className="relative inline-flex items-center gap-1.5">
                {r.icon}
                <span>{r.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

/** Re-export the defaults so consumers can adapt them without duplicating.
 *  `ROLE_META` carries all four roles for id-keyed lookups (labels, demo
 *  emails, icons) even though only the two public pills are rendered. */
export { LOGIN_PILLS as ROLE_PILLS, SIGNUP_TWO as ROLE_CARDS, ROLE_META };
