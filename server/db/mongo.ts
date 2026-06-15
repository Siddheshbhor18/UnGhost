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
    cached.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
      maxPoolSize: 3,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: process.env.NODE_ENV !== "production",
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
