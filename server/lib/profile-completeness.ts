import type { StudentProfile, User } from "@/shared/types";

/** Minimum profile completeness to submit an application (PRD: gated). */
export const APPLY_THRESHOLD = 60;

/** Soft-nudge threshold — AI Coach + Daily Briefing remind below this. */
export const NUDGE_THRESHOLD = 80;

interface CompletenessResult {
  pct: number;
  earned: number;
  total: number;
  missing: Array<{ key: string; label: string; href: string; weight: number }>;
}

const FIELDS: Array<{
  key: string;
  label: string;
  weight: number;
  href: string;
  test: (p: StudentProfile) => boolean;
}> = [
  {
    key: "alias",
    label: "Pick an alias / preferred name",
    weight: 10,
    href: "/student/profile/edit",
    test: (p) => !!p.alias?.trim(),
  },
  {
    key: "skills",
    label: "Add at least one skill",
    weight: 20,
    href: "/student/profile/edit",
    test: (p) => (p.skills?.length ?? 0) > 0,
  },
  {
    key: "history",
    label: "Add at least one work-history entry",
    weight: 20,
    href: "/student/profile/edit",
    test: (p) => (p.history?.length ?? 0) > 0,
  },
  {
    key: "city",
    label: "Add your city",
    weight: 10,
    href: "/student/profile/edit",
    test: (p) => !!p.city?.trim(),
  },
  {
    key: "contactPhone",
    label: "Add a phone number",
    weight: 10,
    href: "/student/profile/edit",
    test: (p) => !!p.contactPhone?.trim(),
  },
  {
    key: "verifiedSkills",
    label: "Earn at least one Verified Skill (bootcamp)",
    weight: 15,
    href: "/bootcamps",
    test: (p) => (p.verifiedSkills?.length ?? 0) > 0,
  },
  {
    key: "enrolledBootcamps",
    label: "Enroll in your first bootcamp",
    weight: 15,
    href: "/bootcamps",
    test: (p) => (p.enrolledBootcamps?.length ?? 0) > 0,
  },
];

/**
 * Single source of truth for "is this student profile complete enough?"
 * Returns the weighted percentage + a punch-list of missing items so the UI
 * can surface a remediation path.
 */
export function computeCompleteness(
  user: User | null | undefined,
): CompletenessResult {
  const profile = user?.profile;
  if (!profile) {
    return { pct: 0, earned: 0, total: 100, missing: [] };
  }
  let earned = 0;
  const total = FIELDS.reduce((s, f) => s + f.weight, 0);
  const missing: CompletenessResult["missing"] = [];
  for (const f of FIELDS) {
    if (f.test(profile)) {
      earned += f.weight;
    } else {
      missing.push({
        key: f.key,
        label: f.label,
        href: f.href,
        weight: f.weight,
      });
    }
  }
  return {
    pct: Math.round((earned / total) * 100),
    earned,
    total,
    missing,
  };
}

export function isAllowedToApply(user: User | null | undefined): boolean {
  return computeCompleteness(user).pct >= APPLY_THRESHOLD;
}
