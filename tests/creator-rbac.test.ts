/**
 * RBAC proofs for the creator-platform routes (referalsys.md §9 hardening):
 * non-admins can't touch the admin reward/payout actions, and non-creators
 * can't read the creator portal.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";

import { GET as adminRewardsGET } from "@/app/api/admin/rewards/route";
import { POST as approveRewardPOST } from "@/app/api/admin/rewards/[id]/approve/route";
import { POST as processPayoutPOST } from "@/app/api/admin/payouts/[id]/process/route";
import { GET as creatorDashboardGET } from "@/app/api/creator/dashboard/route";
import { GET as creatorPayoutsGET } from "@/app/api/creator/payouts/route";
import { __addAllowedHost } from "@/server/lib/csrf";

__addAllowedHost("test.local");

type Caller = { id: string; role: string } | null;
function asUser(user: Caller) {
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);
}

const getReq = (url: string) => new Request(`http://test.local${url}`);
const postReq = (url: string, body: unknown = {}) =>
  new Request(`http://test.local${url}`, {
    method: "POST",
    headers: { origin: "http://test.local", "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("creator-platform RBAC", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin rewards queue: 403 for a creator, 403 for a student, 200 for admin", async () => {
    asUser({ id: "u_c", role: "creator" });
    expect((await adminRewardsGET(getReq("/api/admin/rewards"), undefined)).status).toBe(403);
    asUser({ id: "u_s", role: "student" });
    expect((await adminRewardsGET(getReq("/api/admin/rewards"), undefined)).status).toBe(403);
    asUser({ id: "u_a", role: "admin" });
    expect((await adminRewardsGET(getReq("/api/admin/rewards"), undefined)).status).toBe(200);
  });

  it("unauthenticated caller can't read the admin rewards queue", async () => {
    asUser(null);
    expect((await adminRewardsGET(getReq("/api/admin/rewards"), undefined)).status).toBe(403);
  });

  it("a non-admin can't approve a reward (CSRF passes; role gate denies)", async () => {
    asUser({ id: "u_c", role: "creator" });
    const res = await approveRewardPOST(postReq("/api/admin/rewards/rw_x/approve"), {
      params: { id: "rw_x" },
    });
    expect(res.status).toBe(403);
  });

  it("a non-admin can't process a payout", async () => {
    asUser({ id: "u_s", role: "student" });
    const res = await processPayoutPOST(
      postReq("/api/admin/payouts/po_x/process", { paymentReference: "UTR1" }),
      { params: { id: "po_x" } },
    );
    expect(res.status).toBe(403);
  });

  it("creator dashboard: 403 for an admin, 200 for the creator", async () => {
    asUser({ id: "u_a", role: "admin" });
    expect((await creatorDashboardGET(getReq("/api/creator/dashboard"), undefined)).status).toBe(403);
    asUser({ id: "u_c", role: "creator" });
    expect((await creatorDashboardGET(getReq("/api/creator/dashboard"), undefined)).status).toBe(200);
  });

  it("creator payouts list is closed to non-creators", async () => {
    asUser({ id: "u_a", role: "admin" });
    expect((await creatorPayoutsGET(getReq("/api/creator/payouts"), undefined)).status).toBe(403);
  });
});
