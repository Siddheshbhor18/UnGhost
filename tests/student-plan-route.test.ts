/**
 * GET /api/student/plan — the live signal the navbar reads to decide whether
 * to render the "Upgrade" CTA. The pre-fix bug treated only legacy `premium`
 * as paid, so jobs-plan buyers kept seeing the CTA and could re-pay for a
 * tier they already held. These tests pin the post-fix contract:
 *   - any non-free effective tier returns paid: true
 *   - the legacy `premium` boolean still works (back-compat for callers
 *     that haven't switched to `paid` yet)
 *   - expired paid plans fall back to free (effectivePlan sweep)
 *   - signed-out / non-student / missing-user → free
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";

import { GET } from "@/app/api/student/plan/route";
import { UserModel } from "@/server/db/models";

function asUser(user: { id: string; role: string } | null): void {
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);
}

async function makeStudent(
  id: string,
  plan: "free" | "jobs_quarterly" | "jobs_annual" | "premium",
  opts: { expiresAt?: string | null } = {},
): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    role: "student",
    name: "P",
    plan,
    planExpiresAt: opts.expiresAt === undefined
      ? plan === "free" || plan === "premium"
        ? undefined
        : new Date(Date.now() + 30 * 86_400_000).toISOString()
      : opts.expiresAt ?? undefined,
    createdAt: new Date().toISOString(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/student/plan", () => {
  it("anonymous → { plan: free, paid: false, premium: false }", async () => {
    asUser(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ plan: "free", paid: false, premium: false });
  });

  it("non-student session → free", async () => {
    asUser({ id: "u_rec", role: "recruiter" });
    const res = await GET();
    expect(await res.json()).toEqual({ plan: "free", paid: false, premium: false });
  });

  it("free student → not paid", async () => {
    await makeStudent("u_free", "free");
    asUser({ id: "u_free", role: "student" });
    const res = await GET();
    expect(await res.json()).toEqual({ plan: "free", paid: false, premium: false });
  });

  it("jobs_quarterly student → paid: true, premium: false", async () => {
    await makeStudent("u_jq", "jobs_quarterly");
    asUser({ id: "u_jq", role: "student" });
    const data = await (await GET()).json();
    expect(data.plan).toBe("jobs_quarterly");
    expect(data.paid).toBe(true);
    expect(data.premium).toBe(false);
  });

  it("jobs_annual student → paid: true, premium: false", async () => {
    await makeStudent("u_ja", "jobs_annual");
    asUser({ id: "u_ja", role: "student" });
    const data = await (await GET()).json();
    expect(data.plan).toBe("jobs_annual");
    expect(data.paid).toBe(true);
    expect(data.premium).toBe(false);
  });

  it("legacy premium student → paid AND premium", async () => {
    await makeStudent("u_p", "premium");
    asUser({ id: "u_p", role: "student" });
    const data = await (await GET()).json();
    expect(data.plan).toBe("premium");
    expect(data.paid).toBe(true);
    expect(data.premium).toBe(true);
  });

  it("expired jobs plan → demoted to free", async () => {
    await makeStudent("u_exp", "jobs_annual", {
      expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    asUser({ id: "u_exp", role: "student" });
    const data = await (await GET()).json();
    expect(data.plan).toBe("free");
    expect(data.paid).toBe(false);
  });

  it("ghost session (no matching user row) → free", async () => {
    asUser({ id: "u_ghost_plan", role: "student" });
    const data = await (await GET()).json();
    expect(data).toEqual({ plan: "free", paid: false, premium: false });
  });
});
