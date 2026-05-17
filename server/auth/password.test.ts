import { describe, expect, it } from "vitest";
import {
  checkPasswordPolicy,
  hashPassword,
  verifyPassword,
} from "./password";

describe("password.hashPassword", () => {
  it("produces a bcrypt $2-prefixed string", async () => {
    const h = await hashPassword("Correct1Horse");
    expect(h).toMatch(/^\$2[aby]\$/);
    expect(h.length).toBeGreaterThanOrEqual(60);
  });

  it("never returns the plaintext", async () => {
    const h = await hashPassword("super-secret-1");
    expect(h).not.toContain("super-secret-1");
  });

  it("rejects empty input", async () => {
    await expect(hashPassword("")).rejects.toThrow();
  });
});

describe("password.verifyPassword", () => {
  it("matches a correct password against its bcrypt hash", async () => {
    const h = await hashPassword("Correct1Horse");
    const r = await verifyPassword("Correct1Horse", h);
    expect(r.ok).toBe(true);
    expect(r.shouldRehash).toBe(false);
  });

  it("rejects a wrong password", async () => {
    const h = await hashPassword("Correct1Horse");
    const r = await verifyPassword("Wrong2Battery", h);
    expect(r.ok).toBe(false);
  });

  it("accepts a legacy plaintext seed hash and flags for rehash", async () => {
    const r = await verifyPassword("demo", "demo");
    expect(r.ok).toBe(true);
    expect(r.shouldRehash).toBe(true);
  });

  it("rejects empty inputs", async () => {
    expect((await verifyPassword("", "x")).ok).toBe(false);
    expect((await verifyPassword("x", "")).ok).toBe(false);
  });
});

describe("password.checkPasswordPolicy", () => {
  it("requires 8+ chars", () => {
    expect(checkPasswordPolicy("Ab1").ok).toBe(false);
  });
  it("requires uppercase", () => {
    expect(checkPasswordPolicy("password1").ok).toBe(false);
  });
  it("requires digit", () => {
    expect(checkPasswordPolicy("Password").ok).toBe(false);
  });
  it("rejects bcrypt-overlength", () => {
    expect(checkPasswordPolicy("A1" + "x".repeat(80)).ok).toBe(false);
  });
  it("accepts a compliant password", () => {
    expect(checkPasswordPolicy("Correct1Horse").ok).toBe(true);
  });
});
