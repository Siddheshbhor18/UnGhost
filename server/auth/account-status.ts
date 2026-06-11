import type { User } from "@/shared/types";

/**
 * Defense-in-depth account-status check for request handlers.
 *
 * The middleware session-epoch gate is the primary revocation mechanism, but it
 * fails OPEN on a Redis error and depends on the epoch having been bumped. This
 * pure check re-verifies the user's live status on the request itself (mirrors
 * the authorize() gate), so a banned / soft-deleted / actively-suspended user
 * riding a still-valid token is blocked even if the edge gate didn't catch it.
 *
 * Pure (no DB) — pass a user already loaded in the handler so it costs nothing.
 */
export function isActiveUser(
  user: Pick<User, "status" | "suspendedUntil"> & { deletedAt?: string },
): boolean {
  const status = user.status ?? "active";
  if (status === "banned" || status === "soft_deleted") return false;
  if (
    status === "suspended" &&
    user.suspendedUntil &&
    new Date(user.suspendedUntil).getTime() > Date.now()
  ) {
    return false;
  }
  if (user.deletedAt) return false;
  return true;
}
