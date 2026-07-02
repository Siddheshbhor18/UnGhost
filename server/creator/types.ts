/**
 * Server-side creator types — thin façade.
 *
 * The pure type-level + constant-level definitions live in
 * `@/shared/types/creator` so that `components/admin/*` and
 * `app/creatordashboard/_components/*` (which the `boundaries` ESLint rule
 * forbids from reaching into `server/`) can share the same vocabulary.
 *
 * This module:
 *   1. Re-exports everything from shared (zero churn for the 26+ existing
 *      callers that import from `@/server/creator/types`).
 *   2. Adds the bits that genuinely need a Node runtime — Zod boundary
 *      schemas (used by route handlers to validate untrusted input) and
 *      `minPayoutPaise()` which reads `process.env`.
 *
 * Do NOT redefine anything that already exists in shared — fix it there.
 */
import { z } from "zod";

import {
  BOOTCAMP_BASE_PAISE,
  DEFAULT_MIN_PAYOUT_PAISE,
  MAX_COMMISSION_PERCENT,
} from "@/shared/types/creator";

// ── Re-exports ──────────────────────────────────────────────────────────────

export * from "@/shared/types/creator";

// ── Server-only: Zod boundary schemas ───────────────────────────────────────

export const socialLinksSchema = z
  .object({
    instagram: z.string().url().max(300).optional(),
    youtube: z.string().url().max(300).optional(),
    linkedin: z.string().url().max(300).optional(),
    twitter: z.string().url().max(300).optional(),
  })
  .strict();

/**
 * Commission input with the §9.5 caps enforced at the boundary:
 *   - percentage: integer-or-decimal in [0, 50]
 *   - fixed: paise in (0, BOOTCAMP_BASE_PAISE]
 */
export const commissionInputSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("percentage"),
      value: z.number().min(0).max(MAX_COMMISSION_PERCENT),
    }),
    z.object({
      type: z.literal("fixed"),
      value: z.number().int().positive().max(BOOTCAMP_BASE_PAISE),
    }),
  ])
  .describe("commission agreement (capped per §9.5)");
export type CommissionInput = z.infer<typeof commissionInputSchema>;

export const createCreatorInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    // Password is now set BY THE ADMIN at creation. The old flow shipped an
    // invite email with a 1-hour token that the creator activated at
    // `/creatordashboard/activate`; ops asked us to collapse that into a
    // single step so admin hands the credentials over out-of-band. Enforced
    // to the same policy the signup form uses (checkPasswordPolicy — 8+
    // chars, one upper, one digit, ≤72 bytes). Never logged or echoed back
    // on the response.
    password: z.string().min(8).max(72),
    socialLinks: socialLinksSchema.optional(),
    bio: z.string().max(2000).optional(),
    commission: commissionInputSchema,
    /** Optional preferred referral code; collision-checked + slugified. */
    referralCode: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/i)
      .min(3)
      .max(40)
      .optional(),
  })
  .strict();
export type CreateCreatorInput = z.infer<typeof createCreatorInputSchema>;

export const paymentDetailsInputSchema = z
  .object({
    method: z.enum(["bank_transfer", "upi"]),
    accountRef: z.string().trim().min(3).max(120),
    accountName: z.string().trim().max(120).optional(),
    ifsc: z
      .string()
      .trim()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .optional(),
  })
  .strict();
export type PaymentDetailsInput = z.infer<typeof paymentDetailsInputSchema>;

export const payoutRequestInputSchema = z
  .object({
    amountPaise: z.number().int().positive().max(50_000_000),
  })
  .strict();
export type PayoutRequestInput = z.infer<typeof payoutRequestInputSchema>;

// ── Server-only: runtime helpers (env reads) ────────────────────────────────

/** Resolved minimum payout in paise (env override, falls back to default). */
export function minPayoutPaise(): number {
  const raw = process.env.MIN_PAYOUT_PAISE;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_MIN_PAYOUT_PAISE;
}
