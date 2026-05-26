import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { redisMode, redis, __resetMockRedis } from "./redis";

describe("redis adapter", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...origEnv };
    __resetMockRedis();
  });

  afterEach(() => {
    // Restore original process.env
    process.env = { ...origEnv };
  });

  describe("redisMode", () => {
    it("returns 'mock' in non-production environments when Upstash variables are missing", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.NODE_ENV = "development";
      
      expect(redisMode()).toBe("mock");
    });

    it("returns 'upstash' in non-production environments when Upstash variables are present", () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
      process.env.NODE_ENV = "development";

      expect(redisMode()).toBe("upstash");
    });

    it("throws a fatal error in production when Upstash variables are missing", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.NODE_ENV = "production";

      expect(() => redisMode()).toThrowError(/Production configuration error/);
    });

    it("returns 'upstash' in production when Upstash variables are present", () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
      process.env.NODE_ENV = "production";

      expect(redisMode()).toBe("upstash");
    });
  });

  describe("mockClient", () => {
    it("can set and get values with TTL", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.NODE_ENV = "development";

      const client = redis();
      await client.set("key1", "val1");
      expect(await client.get("key1")).toBe("val1");

      // Set with high TTL (active)
      await client.set("key2", "val2", { ex: 3600 });
      expect(await client.get("key2")).toBe("val2");
      expect(await client.ttl("key2")).toBeGreaterThan(0);

      // Set with negative/expired TTL (missing)
      await client.set("key3", "val3", { ex: -10 });
      expect(await client.get("key3")).toBeNull();
    });

    it("can delete keys", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.NODE_ENV = "development";

      const client = redis();
      await client.set("k1", "v1");
      await client.set("k2", "v2");

      const delCount = await client.del("k1", "k2", "nonexistent");
      expect(delCount).toBe(2);
      expect(await client.get("k1")).toBeNull();
      expect(await client.get("k2")).toBeNull();
    });

    it("can increment keys", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.NODE_ENV = "development";

      const client = redis();
      expect(await client.incr("counter")).toBe(1);
      expect(await client.incr("counter")).toBe(2);
      expect(await client.get("counter")).toBe("2");
    });

    it("can set expiry and check TTL", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.NODE_ENV = "development";

      const client = redis();
      expect(await client.expire("nonexistent", 60)).toBe(0);

      await client.set("key", "val");
      expect(await client.ttl("key")).toBe(-1); // no expiry

      expect(await client.expire("key", 120)).toBe(1);
      expect(await client.ttl("key")).toBeGreaterThan(0);
      expect(await client.ttl("key")).toBeLessThanOrEqual(120);

      expect(await client.ttl("nonexistent")).toBe(-2);
    });
  });
});
