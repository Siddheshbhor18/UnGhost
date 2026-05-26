import { describe, expect, it, vi } from "vitest";
import { cached, invalidate } from "./cache";

// Mock redis
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
vi.mock("@/server/db/redis", () => ({
  redis: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
  }),
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
});
