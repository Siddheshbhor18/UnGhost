// Shared presentation helpers for the admin Creator CRM surfaces. Pure — no
// business logic, no data access. Keeps status→tone maps and the commission
// preview math in one place so the roster, detail, rewards, and payouts views
// never drift apart.
import type { BadgeTone } from "@/components/ui";
import {
  BOOTCAMP_BASE_PAISE,
  MAX_COMMISSION_PERCENT,
  type CommissionType,
  type CreatorStatus,
  type RewardStatus,
  type PayoutStatus,
} from "@/shared/types/creator";

/** Origin baked into the client bundle; identical string on server + client so
 *  referral links never trigger a hydration mismatch. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/** Permanent public referral link for a creator. */
export function referralUrl(referralCode: string): string {
  return `${APP_URL}/r/${referralCode}`;
}

/** Money: paise → en-IN ₹ whole rupees (never raw paise, never .XX). Matches
 *  the creator-dashboard formatter so the same amount reads identically on
 *  both surfaces. */
const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(paise: number): string {
  return INR.format(paise / 100);
}

/** Human label for a commission rate: "15%" or "₹750". */
export function commissionRateLabel(type: CommissionType, value: number): string {
  return type === "percentage" ? `${value}%` : formatINR(value);
}

/**
 * Commission a creator would earn on one ₹4,999 (pre-GST) sale, in paise.
 * Mirrors the server engine's `computeCommission` exactly so the live preview
 * never lies: percentage is rounded off the bootcamp base (capped at 50%),
 * fixed is the entered paise. Clamps negatives to zero.
 */
export function previewCommissionPaise(
  type: CommissionType,
  value: number,
): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (type === "percentage") {
    const capped = Math.min(value, MAX_COMMISSION_PERCENT);
    return Math.round((BOOTCAMP_BASE_PAISE * capped) / 100);
  }
  return Math.round(value);
}

export const CREATOR_STATUS_TONE: Record<CreatorStatus, BadgeTone> = {
  pending: "info",
  active: "success",
  suspended: "warning",
  terminated: "error",
};

export const REWARD_STATUS_TONE: Record<RewardStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  reversed: "neutral",
};

export const PAYOUT_STATUS_TONE: Record<PayoutStatus, BadgeTone> = {
  requested: "info",
  approved: "highlight",
  processing: "warning",
  paid: "success",
  rejected: "error",
};

/** Short, locale-aware date for table cells (e.g. "27 Jun 2026"). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
