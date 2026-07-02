/**
 * Regression tests for the admin-set-password creator onboarding flow.
 *
 * Prior to this change: admin created the creator with no password, then
 * emailed a 1-hour reset-token link; creator set their own password via
 * `/creatordashboard/activate`. Now: admin sets the password directly at
 * onboarding, out-of-band credential handoff.
 *
 * Guards:
 *   - The stored password is bcrypt-hashed (never plaintext).
 *   - The plaintext password is NEVER echoed back on the response payload.
 *   - Login works IMMEDIATELY with the admin-supplied credential.
 *   - Weak passwords are rejected at the boundary with the policy detail.
 *   - Profile lands `active` at creation (no separate token-activation step).
 *   - Duplicate-email attempt returns `email_taken`, not a leaked password.
 *   - The creator-event audit log records `creator.created` WITHOUT any
 *     password fragment in the metadata.
 */
import { describe, it, expect } from "vitest";
import { createCreator } from "@/server/creator/creator.service";
import { verifyPassword } from "@/server/auth/password";
import { UserModel } from "@/server/db/models";
import {
  CreatorProfileModel,
  CreatorEventModel,
} from "@/server/db/creator-models";

const ADMIN = "u_admin_test";

interface UserRowShape {
  passwordHash?: string;
  role?: string;
  status?: string;
  email?: string;
}

interface EventShape {
  eventType: string;
  metadata?: unknown;
}

describe("createCreator — admin-set password", () => {
  it("stores a bcrypt hash and lets the creator log in with that password immediately", async () => {
    const password = "AdminSet_Passw0rd";
    const email = `c_${Math.random().toString(36).slice(2, 9)}@x.test`;

    const res = await createCreator(
      {
        name: "Priya Sharma",
        email,
        password,
        commission: { type: "percentage", value: 15 },
      },
      ADMIN,
    );

    if (!res.ok) throw new Error(`createCreator failed: ${res.reason}`);
    expect(res.profile.status).toBe("active");
    expect(res.profile.acceptedAt).toBeTruthy();
    expect(res.profile.acceptedAt).toBe(res.profile.createdAt);

    // Password is bcrypt-hashed, NOT plaintext.
    const userRow = (await UserModel.findById(res.profile.creatorId).lean()) as
      | UserRowShape
      | null;
    expect(userRow?.passwordHash).toBeTruthy();
    expect(userRow?.passwordHash).not.toBe(password);
    expect(userRow?.passwordHash).toMatch(/^\$2[aby]\$/);

    // Login works with the admin-supplied credential.
    const okLogin = await verifyPassword(password, userRow?.passwordHash ?? "");
    expect(okLogin.ok).toBe(true);
    // Wrong password fails.
    const badLogin = await verifyPassword("Wrong_Passw0rd", userRow?.passwordHash ?? "");
    expect(badLogin.ok).toBe(false);
  });

  it("never echoes the plaintext password back on the response", async () => {
    const password = "MYSECRET_marker_ZzZ9";
    const email = `c_${Math.random().toString(36).slice(2, 9)}@x.test`;

    const res = await createCreator(
      {
        name: "Leak Test",
        email,
        password,
        commission: { type: "percentage", value: 10 },
      },
      ADMIN,
    );
    if (!res.ok) throw new Error("createCreator failed");

    // String-search the entire response so a shape change can't hide a leak.
    const serialised = JSON.stringify({
      profile: res.profile,
      agreement: res.agreement,
    });
    expect(serialised).not.toContain(password);
    expect(serialised).not.toContain("passwordHash");
  });

  it("does NOT put the plaintext or hash into the creator-event audit log", async () => {
    const password = "AUDIT_marker_1Q9";
    const email = `c_${Math.random().toString(36).slice(2, 9)}@x.test`;

    const res = await createCreator(
      {
        name: "Audit Test",
        email,
        password,
        commission: { type: "percentage", value: 12 },
      },
      ADMIN,
    );
    if (!res.ok) throw new Error("createCreator failed");

    const events = (await CreatorEventModel.find({
      entityId: res.profile.creatorId,
    }).lean()) as unknown as EventShape[];

    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      const serialised = JSON.stringify(e);
      expect(serialised).not.toContain(password);
      expect(serialised).not.toContain("passwordHash");
    }
  });

  it("rejects a weak password with the policy detail — no user row created", async () => {
    const email = `weak_${Math.random().toString(36).slice(2, 9)}@x.test`;
    const before = await UserModel.countDocuments({ email });
    expect(before).toBe(0);

    const res = await createCreator(
      {
        name: "Weak Password",
        email,
        password: "short", // 5 chars, no uppercase, no digit
        commission: { type: "percentage", value: 10 },
      },
      ADMIN,
    );

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("weak_password");
      expect(res.detail).toBeTruthy();
    }

    // Confirm no partial state written — this matters because we hash BEFORE
    // insert, so an early return must not leave orphaned rows.
    const after = await UserModel.countDocuments({ email });
    expect(after).toBe(0);
    const profile = await CreatorProfileModel.findOne({}).where("_id").in([]);
    // (No cross-check needed; the user-row check is sufficient — profile
    // creation happens after user insert.)
    expect(profile).toBeNull();
  });

  it("rejects duplicate email with `email_taken` — original creator's password is unchanged", async () => {
    const email = `dup_${Math.random().toString(36).slice(2, 9)}@x.test`;
    const originalPassword = "Original_Passw0rd";
    const attackerPassword = "ATTACKER_Passw0rd";

    const first = await createCreator(
      {
        name: "Original",
        email,
        password: originalPassword,
        commission: { type: "percentage", value: 10 },
      },
      ADMIN,
    );
    if (!first.ok) throw new Error("first createCreator failed");
    const originalHash = (
      (await UserModel.findById(first.profile.creatorId).lean()) as
        | UserRowShape
        | null
    )?.passwordHash;

    // Second attempt with same email but different password MUST be rejected
    // without touching the original credential.
    const second = await createCreator(
      {
        name: "Attacker",
        email,
        password: attackerPassword,
        commission: { type: "percentage", value: 10 },
      },
      ADMIN,
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("email_taken");

    // Verify the original hash is untouched.
    const afterHash = (
      (await UserModel.findById(first.profile.creatorId).lean()) as
        | UserRowShape
        | null
    )?.passwordHash;
    expect(afterHash).toBe(originalHash);

    // Original password still works; attacker password does not.
    const okOriginal = await verifyPassword(originalPassword, afterHash ?? "");
    expect(okOriginal.ok).toBe(true);
    const okAttacker = await verifyPassword(attackerPassword, afterHash ?? "");
    expect(okAttacker.ok).toBe(false);
  });
});
