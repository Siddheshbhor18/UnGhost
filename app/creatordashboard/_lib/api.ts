/**
 * Typed client for the creator portal API routes. Every response is annotated
 * with a concrete shape — fetch JSON is never read through inline casts. All
 * routes are scoped server-side to the session user, so no ids are ever sent.
 */
import type {
  CommissionAgreement,
  CreatorProfile,
  CreatorReward,
  CreditLedgerEntry,
  PayoutRequest,
} from "@/server/creator/types";

// ── Response shapes (mirror the route handlers under app/api/creator/*) ───────

export interface DashboardResponse {
  balancePaise: number;
  referrals: number;
  profile: CreatorProfile | null;
  activeAgreement: CommissionAgreement | null;
  recentRewards: CreatorReward[];
  totals: { lifetimePaise: number; pendingPaise: number };
}

export interface RewardsResponse {
  rewards: CreatorReward[];
}

export interface LedgerResponse {
  entries: CreditLedgerEntry[];
  balancePaise: number;
}

export interface CampaignsResponse {
  referralCode: string;
  referralUrl: string;
  campaigns: string[];
}

export interface PayoutsResponse {
  payouts: PayoutRequest[];
}

export interface ProfileResponse {
  profile: CreatorProfile | null;
}

/** Why a payout request was refused — surfaced verbatim by the service. */
export type PayoutRefusalReason =
  | "no_payment_method"
  | "not_verified"
  | "below_minimum"
  | "insufficient_balance";

export interface PayoutErrorBody {
  error: PayoutRefusalReason | string;
  detail?: { minPaise?: number; balancePaise?: number };
}

/** Carries the HTTP status so callers can branch on 403 (not logged in / wrong role). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason?: string,
  ) {
    super(reason ?? `request_failed_${status}`);
    this.name = "ApiError";
  }
}

interface ApiErrorShape {
  error?: string;
}

/** GET a JSON endpoint with no caching. Throws {@link ApiError} on non-2xx. */
export async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new ApiError(0, "network_error");
  }
  if (!res.ok) {
    let reason: string | undefined;
    try {
      const body = (await res.json()) as ApiErrorShape;
      reason = body.error;
    } catch {
      reason = undefined;
    }
    throw new ApiError(res.status, reason);
  }
  return (await res.json()) as T;
}
