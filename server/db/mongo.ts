import mongoose from "mongoose";

function getMongoUri() {
  return (
    process.env.MONGODB_URI ??
    "mongodb://noghost:noghost@127.0.0.1:27018/noghost?authSource=admin"
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __NG_MONGOOSE__: MongooseCache | undefined;
}

const cached: MongooseCache =
  globalThis.__NG_MONGOOSE__ ?? { conn: null, promise: null };
globalThis.__NG_MONGOOSE__ = cached;

/** DNS / network hiccups that warrant a quick retry rather than a hard failure.
 *  Atlas `mongodb+srv://` re-resolves an SRV DNS record on connect, and flaky
 *  resolvers intermittently return ETIMEOUT / ECONNREFUSED for that lookup. A
 *  config error (bad URI, auth) is NOT in this set, so it still fails fast. */
const TRANSIENT_CONN_CODES = new Set([
  "ETIMEOUT",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

export function isTransientConnError(err: unknown): boolean {
  const e = err as { code?: string; name?: string; message?: string };
  if (e?.code && TRANSIENT_CONN_CODES.has(e.code)) return true;
  if (e?.name === "MongooseServerSelectionError") return true;
  return /querySrv|ETIMEOUT|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(
    e?.message ?? "",
  );
}

/** Connect with a bounded retry on transient DNS/network failures. `connect`
 *  is injectable so the retry policy can be unit-tested without a real server. */
export async function connectWithRetry(
  uri: string,
  opts: Parameters<typeof mongoose.connect>[1],
  connect: (
    uri: string,
    opts: Parameters<typeof mongoose.connect>[1],
  ) => Promise<typeof mongoose> = mongoose.connect.bind(mongoose),
  maxAttempts = 2,
): Promise<typeof mongoose> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await connect(uri, opts);
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isTransientConnError(err)) throw err;
      // Short backoff, then re-resolve the SRV record and reconnect.
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastErr;
}

export async function connectMongo(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    // Connection pool tuning for Vercel serverless + Atlas Flex. On Vercel each
    // function instance serves one request at a time, so it needs only a tiny
    // pool — but Vercel fans out to many concurrent instances under load, and
    // every instance's pool counts against Atlas Flex's ~500-connection ceiling.
    // Oversized per-instance pools are exactly what exhausts that ceiling on a
    // traffic spike.
    //   • maxPoolSize 3        — small ceiling per instance (~3× more headroom
    //                            than the old 10 against Flex's connection cap).
    //   • minPoolSize 0        — hold NO idle sockets. minPoolSize 1 pinned a
    //                            connection open on every warm instance even while
    //                            idle, so N idle instances wasted N Flex connections.
    //   • serverSelectionTimeoutMS 5000 — fail fast on bad URIs instead of a 30s hang.
    //   • socketTimeoutMS 45000 — kill stuck reads before the Vercel function timeout.
    //   • bufferCommands false  — surface errors immediately if disconnected rather
    //                             than silently queuing commands in memory.
    //   • autoIndex (prod off)  — index creation is owned by migrate-mongo
    //                             (server/db/migrations). Leaving it on would make
    //                             every prod cold start re-ensure schema indexes
    //                             (extra round-trips + connections); dev keeps it on.
    cached.promise = connectWithRetry(getMongoUri(), {
      bufferCommands: false,
      maxPoolSize: 3,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: process.env.NODE_ENV !== "production",
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Never cache a rejected promise: a transient connect failure would then
    // 500 every request until a restart. Null it so the next call re-attempts.
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
