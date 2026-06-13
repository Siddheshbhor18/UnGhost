import { describe, expect, it, vi } from "vitest";
import { cached, invalidate } from "./cache";

// Mock redis. redis() is a factory that can itself throw (prod misconfig:
// missing Upstash env), so route it through a vi.fn we can make throw.
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
const mockRedis = vi.fn(() => ({
  get: mockRedisGet,
  set: mockRedisSet,
  del: mockRedisDel,
}));
vi.mock("@/server/db/redis", () => ({
  redis: () => mockRedis(),
}));

// Mock logger
vi.mock("@/server/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
  },
}));

describe("cache", () => {
  it("hits the loader on cache miss", async () => {
    mockRedisGet.mockResolvedValue(null);
    const loader = vi.fn().mockResolvedValue({ val: 42 });
    const res = await cached("testkey", 60, loader);
    expect(res).toEqual({ val: 42 });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledWith("cache:testkey", JSON.stringify({ val: 42 }), { ex: 60 });
  });

  it("returns cached value on cache hit", async () => {
    mockRedisGet.mockResolvedValue(JSON.stringify({ val: 100 }));
    const loader = vi.fn();
    const res = await cached("testkey", 60, loader);
    expect(res).toEqual({ val: 100 });
    expect(loader).not.toHaveBeenCalled();
  });

  it("invalidates keys correctly", async () => {
    mockRedisDel.mockResolvedValue(1);
    await invalidate("key1", "key2");
    expect(mockRedisDel).toHaveBeenCalledWith("cache:key1", "cache:key2");
  });

  // Regression (Sentry UNGHOST-6): a misconfigured prod (missing Upstash env)
  // makes redis() throw synchronously. The read-through cache must swallow it
  // and serve from the loader, not crash the calling page.
  it("falls through to the loader when redis() throws", async () => {
    mockRedisSet.mockClear();
    mockRedis.mockImplementationOnce(() => {
      throw new Error(
        "Production configuration error: Missing required Upstash Redis environment variables.",
      );
    });
    const loader = vi.fn().mockResolvedValue({ val: 7 });
    const res = await cached("bootcamps:all", 300, loader);
    expect(res).toEqual({ val: 7 });
    expect(loader).toHaveBeenCalledTimes(1);
    // Never acquired a client, so no write is attempted.
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("does not throw from invalidate when redis() throws", async () => {
    mockRedis.mockImplementationOnce(() => {
      throw new Error("prod misconfig");
    });
    await expect(invalidate("bootcamps:all")).resolves.toBeUndefined();
  });
});
