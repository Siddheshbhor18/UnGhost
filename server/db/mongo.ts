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
    cached.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
