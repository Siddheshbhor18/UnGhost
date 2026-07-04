import { describe, it, expect, vi } from "vitest";
import mongoose from "mongoose";
import { isTransientConnError, connectWithRetry } from "./mongo";

// A stand-in for the resolved mongoose instance the real connect() returns.
const FAKE_CONN = {} as typeof mongoose;
const OPTS = { serverSelectionTimeoutMS: 100 };

describe("isTransientConnError", () => {
  it("flags DNS/network hiccups worth retrying", () => {
    expect(isTransientConnError({ code: "ETIMEOUT" })).toBe(true);
    expect(isTransientConnError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isTransientConnError({ code: "ENOTFOUND" })).toBe(true);
    expect(isTransientConnError({ name: "MongooseServerSelectionError" })).toBe(
      true,
    );
    // The exact failure that caused the "ghost tripped" 500s.
    expect(
      isTransientConnError({
        message: "querySrv ETIMEOUT _mongodb._tcp.unghost.example.mongodb.net",
      }),
    ).toBe(true);
  });

  it("does NOT retry config/auth errors (fail fast)", () => {
    expect(
      isTransientConnError({ code: "AuthenticationFailed", message: "bad auth" }),
    ).toBe(false);
    expect(isTransientConnError({ message: "invalid connection string" })).toBe(
      false,
    );
    expect(isTransientConnError(null)).toBe(false);
    expect(isTransientConnError(undefined)).toBe(false);
  });
});

describe("connectWithRetry", () => {
  it("succeeds after a single transient failure", async () => {
    const connect = vi
      .fn()
      .mockRejectedValueOnce({ code: "ETIMEOUT" })
      .mockResolvedValueOnce(FAKE_CONN);

    const conn = await connectWithRetry("mongodb://x/db", OPTS, connect, 3);

    expect(conn).toBe(FAKE_CONN);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxAttempts on a persistent transient failure", async () => {
    const err = { code: "ECONNREFUSED", message: "querySrv ECONNREFUSED" };
    const connect = vi.fn().mockRejectedValue(err);

    await expect(
      connectWithRetry("mongodb://x/db", OPTS, connect, 2),
    ).rejects.toEqual(err);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("fails fast (no retry) on a non-transient error", async () => {
    const err = { code: "AuthenticationFailed", message: "bad auth" };
    const connect = vi.fn().mockRejectedValue(err);

    await expect(
      connectWithRetry("mongodb://x/db", OPTS, connect, 3),
    ).rejects.toEqual(err);
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
