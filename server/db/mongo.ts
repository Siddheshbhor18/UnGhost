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
    // Connection pool tuning for serverless + cold-start environments:
    //   • maxPoolSize 10        — caps concurrent connections per warm instance.
    //                             Atlas free tier ceiling is ~500, this is comfy.
    //   • minPoolSize 1         — keeps one socket warm so first query after idle
    //                             doesn't pay the TCP+TLS+auth handshake (~300ms).
    //   • serverSelectionTimeoutMS 5000  — fail fast on bad URIs instead of the
    //                             default 30s hang (which masks real errors as "slow").
    //   • socketTimeoutMS 45000 — kill stuck reads before the Vercel function timeout.
    //   • bufferCommands false — surfaces errors immediately if disconnected rather
    //                             than queuing commands in memory (silent failures).
    cached.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
