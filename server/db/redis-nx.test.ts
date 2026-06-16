import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { redis, __resetMockRedis } from "./redis";

/**
 * NX (set-if-absent) is the primitive behind idempotent locks — most notably
 * the SLA sweep firing each T-12h / T-4h warning exactly once. A regression
 * here would silently double-send or drop warnings, so pin the contract.
 *
 * Forces the in-memory mock: a dev `.env.local` may carry real Upstash creds,
 * which would otherwise make `redis()` hit the network and be non-deterministic.
 * CI has no `.env.local`, so it already runs on the mock.
 */
let savedUrl: string | undefined;
let savedToken: string | undefined;

beforeAll(() => {
  savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterAll(() => {
  if (savedUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = savedUrl;
  if (savedToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
});

beforeEach(() => __resetMockRedis());

describe("redis set() NX semantics (idempotent locks)", () => {
  it("sets only when the key is absent and returns null on contention", async () => {
    const r = redis();
    expect(await r.set("lock:sla:app1", "1", { nx: true })).toBe("OK");
    // Second NX attempt must NOT overwrite and must signal failure with null.
    expect(await r.set("lock:sla:app1", "2", { nx: true })).toBeNull();
    expect(await r.get("lock:sla:app1")).toBe("1");
  });

  it("honors nx together with ex (ttl) and still guards", async () => {
    const r = redis();
    expect(await r.set("k", "1", { nx: true, ex: 60 })).toBe("OK");
    expect(await r.set("k", "2", { nx: true, ex: 60 })).toBeNull();
  });

  it("a plain set (no nx) overwrites", async () => {
    const r = redis();
    await r.set("k", "1");
    await r.set("k", "2");
    expect(await r.get("k")).toBe("2");
  });

  it("nx succeeds again once the key is deleted", async () => {
    const r = redis();
    expect(await r.set("k", "1", { nx: true })).toBe("OK");
    await r.del("k");
    expect(await r.set("k", "2", { nx: true })).toBe("OK");
    expect(await r.get("k")).toBe("2");
  });
});
