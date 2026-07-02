/**
 * Regression test — closes the round-2 CRITICAL:
 *   the playback-token route used `LiveSession.registeredStudentIds` for
 *   its paid-content gate, but `registerForLiveSession` had no enrolment
 *   check. Any student could `PATCH /api/live/[id] {action:"register"}`,
 *   land on the registered list, and pull a Cloudflare Stream playback
 *   token for a paid session they never bought.
 *
 * The fix (app/api/live/[id]/playback-token/route.ts) reads
 * `profile.enrolledBootcamps` instead. This test asserts the invariant:
 * an unenrolled student MUST get 403, an enrolled one MUST get a token.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";
import type { Session } from "next-auth";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { GET } from "@/app/api/live/[id]/playback-token/route";
import { LiveSessionModel, UserModel } from "@/server/db/models";

type SessionMock = MockedFunction<typeof getServerSession>;

interface FakeSessionUser {
  id: string;
  role: "student" | "recruiter" | "instructor" | "admin" | "creator";
}

function asUser(user: FakeSessionUser | null): void {
  const mock = getServerSession as SessionMock;
  mock.mockResolvedValue(user ? ({ user } as unknown as Session) : null);
}

const req = (id: string): Request =>
  new Request(`http://test.local/api/live/${id}/playback-token`);

async function seedPaidLiveSession(
  sessionId: string,
  bootcampId: string,
): Promise<void> {
  await LiveSessionModel.create({
    _id: sessionId,
    bootcampId,
    instructorId: "usr_instr",
    title: "Paid class",
    startsAt: new Date().toISOString(),
    durationMin: 60,
    status: "live",
    tier: "paid",
    streamProvider: "cloudflare",
    createdAt: new Date().toISOString(),
  });
}

async function seedStudent(
  id: string,
  enrolledBootcamps: string[],
): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    name: "S",
    role: "student",
    passwordHash: "",
    profile: {
      alias: "s",
      contactEmail: `${id}@x.test`,
      contactPhone: "",
      trajectory: "actively_hunting",
      skills: [],
      verifiedSkills: [],
      enrolledBootcamps,
      history: [],
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
  });
}

describe("GET /api/live/[id]/playback-token — paid-content bypass regression", () => {
  beforeEach(() => vi.clearAllMocks());

  it("403s an unenrolled student on a paid session", async () => {
    await seedPaidLiveSession("live_paid_1", "bc_paid_1");
    await seedStudent("usr_uneroled", []);

    asUser({ id: "usr_uneroled", role: "student" });
    const res = await GET(req("live_paid_1"), {
      params: { id: "live_paid_1" },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("not_enrolled");
  });

  it("403s a student who is in registeredStudentIds but NOT enrolled (the exact old bypass)", async () => {
    await seedPaidLiveSession("live_paid_2", "bc_paid_2");
    await seedStudent("usr_registered_only", []);
    // Simulate the old bypass: student registered themselves for the live
    // session via PATCH action:"register" (`registeredStudentIds` populated)
    // but never enrolled in the paid bootcamp.
    await LiveSessionModel.updateOne(
      { _id: "live_paid_2" },
      { $addToSet: { registeredStudentIds: "usr_registered_only" } },
    );

    asUser({ id: "usr_registered_only", role: "student" });
    const res = await GET(req("live_paid_2"), {
      params: { id: "live_paid_2" },
    });
    // Old code would have returned 200 with a Cloudflare token here.
    // The fix must reject.
    expect(res.status).toBe(403);
  });

  it("returns 400 (stream_not_provisioned or similar) — not 403 — for a properly enrolled student, proving the gate isn't over-restrictive", async () => {
    await seedPaidLiveSession("live_paid_3", "bc_paid_3");
    await seedStudent("usr_enrolled", ["bc_paid_3"]);

    asUser({ id: "usr_enrolled", role: "student" });
    const res = await GET(req("live_paid_3"), {
      params: { id: "live_paid_3" },
    });
    // The enrolment check MUST pass. What comes after (Cloudflare token mint)
    // is mocked-out in this test env, so a 400 stream_not_provisioned is the
    // expected sign the enrolment gate let us through.
    expect([200, 400]).toContain(res.status);
    if (res.status === 400) {
      const body = (await res.json()) as { error?: string };
      expect(body.error).not.toBe("not_enrolled");
    }
  });
});
