/**
 * Credentials role gate (server/auth/index.ts → authorize).
 *
 * A privileged account must be able to authenticate ONLY through the door that
 * submits its matching role: admin via `role=admin` (the /admin door),
 * instructor via `role=instructor`, creator via `role=creator`. The public
 * /login card only ever sends `student`/`recruiter`, so admin/instructor creds
 * typed there are rejected.
 *
 * Regression pin for the hole where OMITTING the `role` field skipped the check
 * entirely (`if (expectedRole && …)`) — a request that just left `role` out
 * authenticated as ANY role, including admin, from anywhere. The gate now
 * requires an EXACT match, so a missing or mismatched role is refused.
 */
import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import { authOptions } from "@/server/auth";
import { hashPassword } from "@/server/auth/password";

/** Pull the credentials provider's REAL authorize off authOptions without an
 *  unchecked cast. next-auth v4 wraps the user fn in a sync shim at
 *  `provider.authorize` and keeps the original async fn at
 *  `provider.options.authorize` — the latter holds our role-gate logic. We
 *  narrow with `in` + `typeof` so the call is genuinely checked. */
function getAuthorize() {
  const provider = authOptions.providers[0];
  if (!provider || !("options" in provider)) {
    throw new Error("credentials provider options not found");
  }
  const options = provider.options;
  if (
    !options ||
    typeof options !== "object" ||
    !("authorize" in options) ||
    typeof options.authorize !== "function"
  ) {
    throw new Error("credentials provider authorize not found");
  }
  return options.authorize;
}

// Minimal request stub — authorize only reads headers (for the rate-limit IP).
const req = { headers: {}, body: {}, query: {}, method: "POST" as const };

/** Read `.role` off an authorize result without asserting a shape. */
function roleOf(user: unknown): unknown {
  return user && typeof user === "object" && "role" in user ? user.role : null;
}

// The app keys users by a string `_id` (getUserById → findById), so seed with
// a document type whose `_id` is a string — the default driver type assumes
// ObjectId and would reject it at compile time.
type SeedUserDoc = { _id: string; [field: string]: unknown };

async function seed(email: string, role: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await mongoose.connection.collection<SeedUserDoc>("users").insertOne({
    _id: `usr_${role}_${Math.random().toString(36).slice(2, 8)}`,
    email: email.toLowerCase(),
    role,
    name: `${role} user`,
    passwordHash,
    status: "active",
    createdAt: new Date(),
  });
}

const ADMIN_PW = "Adm1n-Gate-Pw";
const STUDENT_PW = "Stud-Gate-Pw";
const CREATOR_PW = "Creat0r-Gate-Pw";

describe("authorize — role gate is mandatory and exact", () => {
  beforeEach(async () => {
    await seed("admin@gate.test", "admin", ADMIN_PW);
    await seed("stud@gate.test", "student", STUDENT_PW);
    await seed("creator@gate.test", "creator", CREATOR_PW);
  });

  it("admin authenticates ONLY through the admin door (role=admin)", async () => {
    const authorize = getAuthorize();
    const ok = await authorize(
      { email: "admin@gate.test", password: ADMIN_PW, role: "admin" },
      req,
    );
    expect(roleOf(ok)).toBe("admin");
  });

  it("rejects admin creds submitted from a public tab (student/recruiter)", async () => {
    const authorize = getAuthorize();
    await expect(
      authorize(
        { email: "admin@gate.test", password: ADMIN_PW, role: "student" },
        req,
      ),
    ).rejects.toThrow(/selected role/i);
    await expect(
      authorize(
        { email: "admin@gate.test", password: ADMIN_PW, role: "recruiter" },
        req,
      ),
    ).rejects.toThrow(/selected role/i);
  });

  it("rejects admin creds when the role field is OMITTED (the closed bypass)", async () => {
    const authorize = getAuthorize();
    await expect(
      authorize({ email: "admin@gate.test", password: ADMIN_PW }, req),
    ).rejects.toThrow(/selected role/i);
  });

  it("student still logs in via the student tab", async () => {
    const authorize = getAuthorize();
    const ok = await authorize(
      { email: "stud@gate.test", password: STUDENT_PW, role: "student" },
      req,
    );
    expect(roleOf(ok)).toBe("student");
  });

  it("creator logs in via its hidden door (role=creator), not a public tab", async () => {
    const authorize = getAuthorize();
    const ok = await authorize(
      { email: "creator@gate.test", password: CREATOR_PW, role: "creator" },
      req,
    );
    expect(roleOf(ok)).toBe("creator");
    await expect(
      authorize(
        { email: "creator@gate.test", password: CREATOR_PW, role: "student" },
        req,
      ),
    ).rejects.toThrow(/selected role/i);
  });

  it("wrong password returns null even when the role matches (no leak)", async () => {
    const authorize = getAuthorize();
    const res = await authorize(
      { email: "admin@gate.test", password: "wrong-pw", role: "admin" },
      req,
    );
    expect(res).toBeNull();
  });
});
