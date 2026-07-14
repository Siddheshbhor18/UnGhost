/**
 * External-platform live sessions (Zoho Meet et al.) — three invariants:
 *
 *  1. Create validation — `POST /api/live` accepts the legacy on-platform
 *     payload untouched, and for `sessionType: "external"` requires an
 *     https:// join link (never `javascript:`/`http:`).
 *
 *  2. Masked join gate — `GET /api/live/[id]/join` is the ONLY egress for
 *     `externalJoinUrl`: enrolled students get a 302 to the meeting,
 *     unenrolled students land on the bootcamp paywall, stale (ended)
 *     cards bounce back, and joins are attendance-recorded exactly once.
 *
 *  3. THE LEAK TEST — no student-reachable payload ever contains the
 *     external URL (or the Cloudflare stream key): the student session
 *     list, the single-session GET, and the bootcamp-page store query are
 *     serialized wholesale and greped for the secret.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MockedFunction } from "vitest";
import type { Session } from "next-auth";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));

import { getServerSession } from "next-auth";
import { POST as createSession, GET as listSessions } from "@/app/api/live/route";
import { GET as joinSession } from "@/app/api/live/[id]/join/route";
import {
  GET as getOneSession,
  PATCH as patchSession,
} from "@/app/api/live/[id]/route";
import { POST as presignUpload } from "@/app/api/instructor/upload-video/route";
import { PATCH as adminPatch } from "@/app/api/admin/live-sessions/[id]/route";
import {
  BootcampModel,
  LiveSessionModel,
  AuditLogModel,
  LiveSessionAttendeeModel,
  UserModel,
} from "@/server/db/models";
import { listLiveSessionsByBootcamp } from "@/server/store";

type SessionMock = MockedFunction<typeof getServerSession>;

interface FakeSessionUser {
  id: string;
  role: "student" | "recruiter" | "instructor" | "admin" | "creator";
}

function asUser(user: FakeSessionUser | null): void {
  const mock = getServerSession as SessionMock;
  mock.mockResolvedValue(user ? ({ user } as unknown as Session) : null);
}

const ORIGIN = "http://localhost:3000";
const SECRET_URL = "https://meet.zoho.com/super-secret-room-xyz";

function createReq(body: Record<string, unknown>): Request {
  return new Request(`${ORIGIN}/api/live`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

function joinReq(id: string): Request {
  return new Request(`${ORIGIN}/api/live/${id}/join`);
}

function validExternalPayload(bootcampId: string): Record<string, unknown> {
  return {
    bootcampId,
    title: "Zoho GTM masterclass",
    description: "Two-day live sprint",
    startsAt: new Date(Date.now() + 60_000).toISOString(),
    durationMin: 90,
    sessionType: "external",
    externalJoinUrl: SECRET_URL,
    thumbnailUrl: "https://uploads.unghost.in/thumb.png",
  };
}

async function seedBootcamp(id: string, instructorId: string): Promise<void> {
  await BootcampModel.create({ _id: id, instructorId, title: "GTM Cohort" });
}

async function seedExternalSession(
  sessionId: string,
  bootcampId: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await LiveSessionModel.create({
    _id: sessionId,
    bootcampId,
    instructorId: "usr_instr",
    title: "External class",
    startsAt: new Date().toISOString(),
    durationMin: 90,
    status: "live",
    tier: "paid",
    roomCode: `code_${sessionId}`,
    sessionType: "external",
    externalJoinUrl: SECRET_URL,
    createdAt: new Date().toISOString(),
    ...overrides,
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

describe("POST /api/live — external-session create validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("still accepts the legacy on-platform payload with zero new fields", async () => {
    await seedBootcamp("bc_legacy", "usr_instr");
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await createSession(
      createReq({
        bootcampId: "bc_legacy",
        title: "Classic session",
        startsAt: new Date().toISOString(),
        durationMin: 60,
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { sessionType?: string };
    expect(body.sessionType).toBe("unghost");
  });

  it("creates an external session and never echoes the join URL", async () => {
    await seedBootcamp("bc_ext_ok", "usr_instr");
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await createSession(createReq(validExternalPayload("bc_ext_ok")));
    expect(res.status).toBe(201);
    const raw = await res.text();
    expect(raw).not.toContain(SECRET_URL);
    const body = JSON.parse(raw) as { id: string; sessionType: string };
    expect(body.sessionType).toBe("external");
    // …but the secret IS persisted for the join route to read.
    const doc = await LiveSessionModel.findById(body.id)
      .select("+externalJoinUrl")
      .lean();
    expect(doc?.externalJoinUrl).toBe(SECRET_URL);
  });

  it.each([
    ["http (not https)", "http://meet.zoho.com/x"],
    ["javascript scheme", "javascript:alert(1)"],
    ["protocol-relative", "//evil.example/x"],
  ])("rejects a %s join link", async (_label, url) => {
    await seedBootcamp("bc_ext_bad", "usr_instr");
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await createSession(
      createReq({ ...validExternalPayload("bc_ext_bad"), externalJoinUrl: url }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an external session without a join link", async () => {
    await seedBootcamp("bc_ext_missing", "usr_instr");
    asUser({ id: "usr_instr", role: "instructor" });
    const payload = validExternalPayload("bc_ext_missing");
    delete payload.externalJoinUrl;
    const res = await createSession(createReq(payload));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/live/[id]/join — masked egress gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects anonymous visitors to login, not the meeting", async () => {
    await seedExternalSession("live_anon", "bc_anon");
    asUser(null);
    const res = await joinSession(joinReq("live_anon"), {
      params: { id: "live_anon" },
    });
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).not.toContain("meet.zoho.com");
  });

  it("404s an unknown session", async () => {
    asUser({ id: "usr_x", role: "student" });
    const res = await joinSession(joinReq("live_nope"), {
      params: { id: "live_nope" },
    });
    expect(res.status).toBe(404);
  });

  it("400s an on-platform session — this route is external-only", async () => {
    await seedExternalSession("live_ug", "bc_ug", { sessionType: "unghost" });
    asUser({ id: "usr_x", role: "student" });
    const res = await joinSession(joinReq("live_ug"), {
      params: { id: "live_ug" },
    });
    expect(res.status).toBe(400);
  });

  it("302s an enrolled student to the meeting and records attendance once across double-clicks", async () => {
    await seedExternalSession("live_ok", "bc_ok");
    await seedStudent("usr_enrolled", ["bc_ok"]);
    asUser({ id: "usr_enrolled", role: "student" });

    for (let i = 0; i < 2; i++) {
      const res = await joinSession(joinReq("live_ok"), {
        params: { id: "live_ok" },
      });
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(SECRET_URL);
    }

    const attendees = await LiveSessionAttendeeModel.find({
      sessionId: "live_ok",
    }).lean();
    expect(attendees).toHaveLength(1);
    expect(attendees[0]?.userId).toBe("usr_enrolled");
  });

  it("sends an unenrolled student to the bootcamp paywall — never the meeting URL", async () => {
    await seedExternalSession("live_gate", "bc_gate");
    await seedStudent("usr_free", []);
    asUser({ id: "usr_free", role: "student" });
    const res = await joinSession(joinReq("live_gate"), {
      params: { id: "live_gate" },
    });
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/bootcamp/bc_gate");
    expect(location).not.toContain("meet.zoho.com");
    // Gate refusal must not count as attendance.
    const attendees = await LiveSessionAttendeeModel.find({
      sessionId: "live_gate",
    }).lean();
    expect(attendees).toHaveLength(0);
  });

  it("bounces a stale (ended) card back to the bootcamp page", async () => {
    await seedExternalSession("live_ended", "bc_ended", { status: "ended" });
    await seedStudent("usr_late", ["bc_ended"]);
    asUser({ id: "usr_late", role: "student" });
    const res = await joinSession(joinReq("live_ended"), {
      params: { id: "live_ended" },
    });
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/bootcamp/bc_ended");
    expect(location).not.toContain("meet.zoho.com");
  });

  it("lets the owning instructor preview without polluting attendance", async () => {
    await seedExternalSession("live_own", "bc_own");
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await joinSession(joinReq("live_own"), {
      params: { id: "live_own" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(SECRET_URL);
    const attendees = await LiveSessionAttendeeModel.find({
      sessionId: "live_own",
    }).lean();
    expect(attendees).toHaveLength(0);
  });
});

describe("LEAK TEST — the join URL never serializes to student-reachable payloads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/live (student list) carries neither the join URL nor stream keys", async () => {
    await seedExternalSession("live_leak1", "bc_leak", {
      cfStreamKey: "cf-secret-stream-key",
      cfRtmpUrl: "rtmps://cf-secret-ingest/live",
    });
    await seedStudent("usr_leak", ["bc_leak"]);
    asUser({ id: "usr_leak", role: "student" });

    const res = await listSessions();
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).toContain("live_leak1"); // the session IS visible…
    expect(raw).not.toContain(SECRET_URL); // …its secrets are NOT
    expect(raw).not.toContain("cf-secret-stream-key");
    expect(raw).not.toContain("cf-secret-ingest");
  });

  it("GET /api/live/[id] (full single-session read) is clean", async () => {
    await seedExternalSession("live_leak2", "bc_leak2");
    await seedStudent("usr_leak2", ["bc_leak2"]);
    asUser({ id: "usr_leak2", role: "student" });

    const res = await getOneSession(
      new Request(`${ORIGIN}/api/live/live_leak2`),
      { params: { id: "live_leak2" } },
    );
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).not.toContain(SECRET_URL);
  });

  it("listLiveSessionsByBootcamp (feeds the bootcamp room RSC) is clean", async () => {
    await seedExternalSession("live_leak3", "bc_leak3");
    const sessions = await listLiveSessionsByBootcamp("bc_leak3");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.sessionType).toBe("external");
    expect(JSON.stringify(sessions)).not.toContain(SECRET_URL);
  });
});

describe("PATCH /api/live/[id] — updateExternal (edit-after-create)", () => {
  beforeEach(() => vi.clearAllMocks());

  function patchReq(id: string, body: Record<string, unknown>): Request {
    return new Request(`${ORIGIN}/api/live/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(body),
    });
  }

  it("lets the owner rotate the link — join follows the NEW URL, response echoes nothing", async () => {
    await seedExternalSession("live_rot", "bc_rot");
    await seedStudent("usr_rot", ["bc_rot"]);
    const newUrl = "https://meet.zoho.com/replacement-room-42";

    asUser({ id: "usr_instr", role: "instructor" });
    const res = await patchSession(
      patchReq("live_rot", {
        action: "updateExternal",
        externalJoinUrl: newUrl,
        title: "Renamed sprint",
      }),
      { params: { id: "live_rot" } },
    );
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).not.toContain(newUrl);
    expect(raw).not.toContain(SECRET_URL);

    asUser({ id: "usr_rot", role: "student" });
    const join = await joinSession(joinReq("live_rot"), {
      params: { id: "live_rot" },
    });
    expect(join.status).toBe(302);
    expect(join.headers.get("location")).toBe(newUrl);
  });

  it("403s a non-owner instructor", async () => {
    await seedExternalSession("live_notmine", "bc_notmine");
    asUser({ id: "usr_other_instr", role: "instructor" });
    const res = await patchSession(
      patchReq("live_notmine", {
        action: "updateExternal",
        externalJoinUrl: "https://meet.zoho.com/hijack",
      }),
      { params: { id: "live_notmine" } },
    );
    expect(res.status).toBe(403);
  });

  it("400s an on-platform session — no grafting links onto unghost rooms", async () => {
    await seedExternalSession("live_graft", "bc_graft", {
      sessionType: "unghost",
      externalJoinUrl: null,
    });
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await patchSession(
      patchReq("live_graft", {
        action: "updateExternal",
        externalJoinUrl: "https://meet.zoho.com/graft",
      }),
      { params: { id: "live_graft" } },
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-https replacement link", async () => {
    await seedExternalSession("live_badrot", "bc_badrot");
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await patchSession(
      patchReq("live_badrot", {
        action: "updateExternal",
        externalJoinUrl: "javascript:alert(1)",
      }),
      { params: { id: "live_badrot" } },
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/instructor/upload-video — image kind (thumbnails)", () => {
  beforeEach(() => vi.clearAllMocks());

  function presignReq(body: Record<string, unknown>): Request {
    return new Request(`${ORIGIN}/api/instructor/upload-video`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(body),
    });
  }

  it("presigns a PNG thumbnail upload", async () => {
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await presignUpload(
      presignReq({
        contentType: "image/png",
        filename: "thumb.png",
        sizeBytes: 200_000,
        kind: "image",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadUrl?: string; publicUrl?: string };
    expect(body.uploadUrl).toBeTruthy();
    expect(body.publicUrl).toBeTruthy();
  });

  it("rejects a video mime under kind image", async () => {
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await presignUpload(
      presignReq({
        contentType: "video/mp4",
        filename: "sneaky.mp4",
        sizeBytes: 200_000,
        kind: "image",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an oversized image (>5 MB)", async () => {
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await presignUpload(
      presignReq({
        contentType: "image/png",
        filename: "huge.png",
        sizeBytes: 6 * 1024 * 1024,
        kind: "image",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("legacy video presign payload (no kind) still works", async () => {
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await presignUpload(
      presignReq({
        contentType: "video/mp4",
        filename: "lesson.mp4",
        sizeBytes: 10 * 1024 * 1024,
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("HARDENING — deny-by-default paid gate on the join route", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["recruiter", "usr_rec"],
    ["creator", "usr_cre"],
  ] as const)(
    "sends a %s to the paywall — non-student roles can never reach a paid meeting",
    async (role, id) => {
      await seedExternalSession(`live_role_${role}`, `bc_role_${role}`);
      asUser({ id, role });
      const res = await joinSession(joinReq(`live_role_${role}`), {
        params: { id: `live_role_${role}` },
      });
      expect(res.status).toBe(302);
      const location = res.headers.get("location") ?? "";
      expect(location).toContain(`/bootcamp/bc_role_${role}`);
      expect(location).not.toContain("meet.zoho.com");
    },
  );

  it("sends a NON-owner instructor to the paywall — only the owner previews", async () => {
    await seedExternalSession("live_peer", "bc_peer"); // owned by usr_instr
    asUser({ id: "usr_other_instr", role: "instructor" });
    const res = await joinSession(joinReq("live_peer"), {
      params: { id: "live_peer" },
    });
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/bootcamp/bc_peer");
    expect(location).not.toContain("meet.zoho.com");
  });

  it("still admits an admin", async () => {
    await seedExternalSession("live_adm", "bc_adm");
    asUser({ id: "usr_admin", role: "admin" });
    const res = await joinSession(joinReq("live_adm"), {
      params: { id: "live_adm" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(SECRET_URL);
  });
});

describe("HARDENING — audit trail for the link lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records external-session creation with the meeting HOST, never the URL", async () => {
    await seedBootcamp("bc_aud1", "usr_instr");
    asUser({ id: "usr_instr", role: "instructor" });
    const res = await createSession(createReq(validExternalPayload("bc_aud1")));
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };

    // writeAuditLog is fire-and-forget — poll briefly for the row.
    await vi.waitFor(async () => {
      const rows = await AuditLogModel.find({ targetId: id }).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe("live_session.external_create");
      expect(rows[0]?.actorId).toBe("usr_instr");
      expect(rows[0]?.summary).toContain("meet.zoho.com");
      expect(JSON.stringify(rows)).not.toContain(SECRET_URL);
    });
  });

  it("records link rotation with attribution — host only", async () => {
    await seedExternalSession("live_aud2", "bc_aud2");
    asUser({ id: "usr_instr", role: "instructor" });
    const newUrl = "https://meet.google.com/secret-rotation-path";
    const res = await patchSession(
      new Request(`${ORIGIN}/api/live/live_aud2`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({
          action: "updateExternal",
          externalJoinUrl: newUrl,
        }),
      }),
      { params: { id: "live_aud2" } },
    );
    expect(res.status).toBe(200);

    await vi.waitFor(async () => {
      const rows = await AuditLogModel.find({ targetId: "live_aud2" }).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.action).toBe("live_session.external_update");
      expect(rows[0]?.summary).toContain("externalJoinUrl");
      expect(rows[0]?.summary).toContain("meet.google.com");
      expect(JSON.stringify(rows)).not.toContain("secret-rotation-path");
    });
  });
});

describe("HARDENING — admin PATCH cannot graft a link onto an unghost session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400s externalJoinUrl on an on-platform session", async () => {
    await seedExternalSession("live_admgraft", "bc_admgraft", {
      sessionType: "unghost",
      externalJoinUrl: null,
    });
    asUser({ id: "usr_admin", role: "admin" });
    const res = await adminPatch(
      new Request(`${ORIGIN}/api/admin/live-sessions/live_admgraft`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({ externalJoinUrl: "https://meet.zoho.com/graft" }),
      }),
      { params: { id: "live_admgraft" } },
    );
    expect(res.status).toBe(400);
  });

  it("accepts a link replacement on an external session", async () => {
    await seedExternalSession("live_admrot", "bc_admrot");
    asUser({ id: "usr_admin", role: "admin" });
    const res = await adminPatch(
      new Request(`${ORIGIN}/api/admin/live-sessions/live_admrot`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({
          externalJoinUrl: "https://meet.zoho.com/admin-fixed",
        }),
      }),
      { params: { id: "live_admrot" } },
    );
    expect(res.status).toBe(200);
    const doc = await LiveSessionModel.findById("live_admrot")
      .select("+externalJoinUrl")
      .lean();
    expect(doc?.externalJoinUrl).toBe("https://meet.zoho.com/admin-fixed");
  });
});
