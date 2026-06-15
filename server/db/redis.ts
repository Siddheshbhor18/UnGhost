/**
 * Redis client — Upstash REST in prod, in-memory shim in dev.
 *
 * Required env for prod:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Without those vars we transparently fall back to a process-local Map that
 * behaves like Redis for the surface area we use (set, get, del, expire,
 * incr, with TTL). This keeps `npm run dev` working offline. Tests should
 * call `__resetMockRedis()` between cases.
 */
import { Redis } from "@upstash/redis";

export interface RedisLike {
  /** Set a key with optional TTL (seconds). With `nx`, only sets if the key is
   *  absent and resolves to `null` when it already exists (atomic lock). */
  set: (
    key: string,
    value: string,
    opts?: { ex?: number; nx?: boolean },
  ) => Promise<unknown>;
  /** Get a key as string (null if missing). */
  get: (key: string) => Promise<string | null>;
  /** Delete one or more keys. */
  del: (...keys: string[]) => Promise<number>;
  /** Increment + return new value. Creates the key with TTL when seeded. */
  incr: (key: string) => Promise<number>;
  /** Set expiry in seconds on an existing key. */
  expire: (key: string, ttlSec: number) => Promise<number>;
  /** TTL in seconds, -1 if no expiry, -2 if missing. */
  ttl: (key: string) => Promise<number>;
}

export type RedisMode = "upstash" | "mock";

export function redisMode(): RedisMode {
  const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;

  if (process.env.NODE_ENV === "production") {
    if (!hasUrl || !hasToken) {
      throw new Error(
        `Production configuration error: Missing required Upstash Redis environment variables. ` +
        `Fallbacks are disabled in production to prevent data inconsistency across instances.`
      );
    }
  }

  return hasUrl && hasToken ? "upstash" : "mock";
}

// ── Upstash adapter ─────────────────────────────────────────────────────────
let _upstash: Redis | null = null;
function upstash(): Redis {
  if (_upstash) return _upstash;
  _upstash = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return _upstash;
}

const upstashClient: RedisLike = {
  async set(key, value, opts) {
    if (opts?.ex || opts?.nx) {
      // Upstash returns "OK" on success, null when NX fails (key exists).
      const o: { ex?: number; nx?: true } = {};
      if (opts.ex) o.ex = opts.ex;
      if (opts.nx) o.nx = true;
      return upstash().set(key, value, o);
    }
    return upstash().set(key, value);
  },
  async get(key) {
    // Upstash auto-deserializes values that look like JSON. That breaks
    // callers (e.g. idempotency cache) that stored a JSON string and
    // expect to JSON.parse() it back. Re-stringify objects so the
    // returned shape always matches what `set()` was given.
    const v = await upstash().get<unknown>(key);
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  },
  async del(...keys) {
    if (keys.length === 0) return 0;
    return upstash().del(...keys);
  },
  async incr(key) {
    return upstash().incr(key);
  },
  async expire(key, ttlSec) {
    return upstash().expire(key, ttlSec);
  },
  async ttl(key) {
    return upstash().ttl(key);
  },
};

// ── In-memory mock ──────────────────────────────────────────────────────────
interface MockEntry {
  value: string;
  /** Absolute expiry epoch ms, or null if no TTL. */
  expiresAt: number | null;
}

// Stash the Map on globalThis so it survives Next.js dev HMR module reloads.
// Without this, OTP set by /api/auth/signup is lost before /api/auth/verify-phone
// can read it (each route boundary may re-evaluate this module). One process,
// one map, regardless of how many times the module file is re-imported.
const GLOBAL_KEY = "__unghost_mock_redis__";
const globalAny = globalThis as unknown as {
  [GLOBAL_KEY]?: Map<string, MockEntry>;
};
const mockStore: Map<string, MockEntry> =
  globalAny[GLOBAL_KEY] ?? new Map<string, MockEntry>();
globalAny[GLOBAL_KEY] = mockStore;

function getMock(key: string): MockEntry | undefined {
  const e = mockStore.get(key);
  if (!e) return undefined;
  if (e.expiresAt !== null && e.expiresAt <= Date.now()) {
    mockStore.delete(key);
    return undefined;
  }
  return e;
}

const mockClient: RedisLike = {
  async set(key, value, opts) {
    if (opts?.nx && getMock(key) !== undefined) return null;
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : null;
    mockStore.set(key, { value, expiresAt });
    return "OK";
  },
  async get(key) {
    return getMock(key)?.value ?? null;
  },
  async del(...keys) {
    let n = 0;
    for (const k of keys) if (mockStore.delete(k)) n++;
    return n;
  },
  async incr(key) {
    const cur = getMock(key);
    const next = String(Number(cur?.value ?? "0") + 1);
    mockStore.set(key, { value: next, expiresAt: cur?.expiresAt ?? null });
    return Number(next);
  },
  async expire(key, ttlSec) {
    const cur = mockStore.get(key);
    if (!cur) return 0;
    cur.expiresAt = Date.now() + ttlSec * 1000;
    return 1;
  },
  async ttl(key) {
    const e = mockStore.get(key);
    if (!e) return -2;
    if (e.expiresAt === null) return -1;
    return Math.max(0, Math.floor((e.expiresAt - Date.now()) / 1000));
  },
};

/** Test-only helper. */
export function __resetMockRedis(): void {
  mockStore.clear();
}

export function redis(): RedisLike {
  return redisMode() === "upstash" ? upstashClient : mockClient;
}
