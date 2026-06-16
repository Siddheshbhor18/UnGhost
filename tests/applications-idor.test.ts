import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the session so we can drive the route as different callers. Must be
// hoisted above the route import (vi.mock is hoisted by vitest).
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/applications/[id]/route";
import { createApplication } from "@/server/store";

function asUser(user: { id: string; role: string } | null) {
  (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    user ? { user } : null,
  );
}

const req = (id: string) =>
  new Request(`http://test.local/api/applications/${id}`);

describe("GET /api/applications/[id] — authorization (IDOR)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forbids a student from reading another student's application", async () => {
    const app = await createApplication({
      jobId: "job_x",
      studentId: "usr_studentA",
      matchPct: 50,
    });
    asUser({ id: "usr_studentB", role: "student" });
    const res = await GET(req(app.id), { params: { id: app.id } });
    expect(res.status).toBe(403);
  });

  it("lets the owning student read their own application", async () => {
    const app = await createApplication({
      jobId: "job_x",
      studentId: "usr_studentA",
      matchPct: 50,
    });
    asUser({ id: "usr_studentA", role: "student" });
    const res = await GET(req(app.id), { params: { id: app.id } });
    expect(res.status).toBe(200);
  });

  it("forbids an instructor from reading any application", async () => {
    const app = await createApplication({
      jobId: "job_x",
      studentId: "usr_studentA",
      matchPct: 50,
    });
    asUser({ id: "usr_inst", role: "instructor" });
    const res = await GET(req(app.id), { params: { id: app.id } });
    expect(res.status).toBe(403);
  });

  it("401s an unauthenticated caller", async () => {
    asUser(null);
    const res = await GET(req("app_whatever"), {
      params: { id: "app_whatever" },
    });
    expect(res.status).toBe(401);
  });

  it("404s an unknown application id for an authenticated student", async () => {
    asUser({ id: "usr_studentA", role: "student" });
    const res = await GET(req("app_nope"), { params: { id: "app_nope" } });
    expect(res.status).toBe(404);
  });
});
